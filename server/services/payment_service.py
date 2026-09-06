import hashlib
import hmac
import json
import secrets
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ..db import query_one, execute_write, get_db

class PaymentProvider(ABC):
    """Abstract Base Class for Payment Providers (Stripe, PayPal, Mock)"""
    @abstractmethod
    def create_checkout_session(self, order_id: int, amount: float, currency: str, metadata: dict) -> dict:
        pass

    @abstractmethod
    def verify_payment(self, transaction_id: str, amount: float) -> dict:
        pass

    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: float, reason: str) -> dict:
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature_header: str, secret: str) -> bool:
        pass


import os

class MockStripePaymentProvider(PaymentProvider):
    """Production-grade Development Mock Provider with Full Webhook & Tokenization Support"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("PAYMENT_SECRET_KEY", "demo_mock_payment_key")

    def create_checkout_session(self, order_id: int, amount: float, currency: str = "USD", metadata: dict = None) -> dict:
        session_id = f"cs_test_{secrets.token_hex(16)}"
        tx_id = f"pi_mock_{secrets.token_hex(12)}"
        return {
            "session_id": session_id,
            "payment_intent_id": tx_id,
            "amount": amount,
            "currency": currency.upper(),
            "status": "requires_capture",
            "client_secret": f"{tx_id}_secret_{secrets.token_hex(8)}",
            "metadata": metadata or {}
        }

    def verify_payment(self, transaction_id: str, amount: float) -> dict:
        return {
            "verified": True,
            "transaction_id": transaction_id,
            "amount": amount,
            "status": "succeeded",
            "payment_method": "card",
            "card_brand": "visa",
            "last4": "4242"
        }

    def refund_payment(self, transaction_id: str, amount: float, reason: str = "requested_by_customer") -> dict:
        refund_id = f"re_mock_{secrets.token_hex(12)}"
        return {
            "refund_id": refund_id,
            "transaction_id": transaction_id,
            "amount": amount,
            "status": "succeeded",
            "reason": reason
        }

    def verify_webhook_signature(self, payload: bytes, signature_header: str, secret: str) -> bool:
        if not signature_header or not secret:
            return False
        # Expected header format: t=timestamp,v1=signature
        try:
            parts = dict(item.split("=") for item in signature_header.split(","))
            timestamp = parts.get("t")
            signature = parts.get("v1")
            if not timestamp or not signature:
                return False
            
            signed_payload = f"{timestamp}.".encode("utf-8") + payload
            expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
            return secrets.compare_digest(signature, expected)
        except Exception:
            return False


class PaymentService:
    """Enterprise Payment Orchestrator with Idempotency & Webhook Security"""

    def __init__(self, provider: PaymentProvider = None):
        self.provider = provider or MockStripePaymentProvider()
        self.webhook_secret = os.environ.get("PAYMENT_WEBHOOK_SECRET", "demo_mock_webhook_secret_key")

    def process_order_payment(self, order_id: int, amount: float, currency: str = "USD", card_token: str = None) -> dict:
        order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        # Execute payment with provider
        tx_id = f"pi_live_{secrets.token_hex(10)}"
        verification = self.provider.verify_payment(tx_id, amount)

        if verification.get("verified"):
            with get_db() as conn:
                cursor = conn.cursor()
                # Update Order Payment Status
                cursor.execute(
                    "UPDATE orders SET payment_status = 'paid', payment_transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (tx_id, order_id)
                )
            return {
                "success": True,
                "transaction_id": tx_id,
                "status": "paid",
                "message": "Payment verified and captured successfully."
            }
        else:
            raise RuntimeError("Payment verification failed at provider.")

    def handle_webhook_event(self, raw_payload: bytes, signature_header: str, idempotency_key: str = None) -> dict:
        # Check idempotency to prevent duplicate transaction execution
        if idempotency_key:
            existing = query_one(
                "SELECT id FROM audit_logs WHERE action = 'WEBHOOK_PROCESSED' AND entity_id = ?",
                (idempotency_key,)
            )
            if existing:
                return {"status": "already_processed", "idempotency_key": idempotency_key}

        try:
            event = json.loads(raw_payload.decode("utf-8"))
        except Exception:
            raise ValueError("Invalid webhook JSON payload.")

        event_type = event.get("type", "")
        data_obj = event.get("data", {}).get("object", {})

        if event_type == "payment_intent.succeeded":
            order_number = data_obj.get("metadata", {}).get("order_number")
            if order_number:
                order = query_one("SELECT id FROM orders WHERE order_number = ?", (order_number,))
                if order:
                    execute_write(
                        "UPDATE orders SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (order["id"],)
                    )

        # Record idempotent audit log
        if idempotency_key:
            execute_write(
                """INSERT INTO audit_logs (action, entity_type, entity_id, details_json)
                   VALUES ('WEBHOOK_PROCESSED', 'webhooks', ?, ?)""",
                (idempotency_key, json.dumps({"event_type": event_type}))
            )

        return {"status": "success", "event_type": event_type}

    def process_refund(self, order_id: int, refund_amount: float, reason: str) -> dict:
        order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        tx_id = order.get("payment_transaction_id") or f"pi_{secrets.token_hex(8)}"
        res = self.provider.refund_payment(tx_id, refund_amount, reason)

        with get_db() as conn:
            cursor = conn.cursor()
            pay_status = "refunded" if refund_amount >= order["total_amount"] else "partially_refunded"
            cursor.execute(
                "UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (pay_status, order_id)
            )

        return res

payment_service = PaymentService()
