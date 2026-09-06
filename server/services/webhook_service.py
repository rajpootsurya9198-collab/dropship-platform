import json
import time
import hmac
import hashlib
import secrets
import requests
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from ..db import query_all, query_one, execute_write

SUPPORTED_EVENTS = [
    "order.created",
    "order.paid",
    "order.fulfilled",
    "order.cancelled",
    "tracking.updated",
    "inventory.low_stock",
    "refund.requested",
    "test.ping"
]

class WebhookService:
    """Enterprise Outbound Webhook Dispatcher & Audit Logger"""

    def __init__(self, max_workers: int = 5):
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="NovaDropWebhookWorker")

    @staticmethod
    def generate_secret() -> str:
        """Generates a secure random webhook signing secret key."""
        return f"whsec_{secrets.token_hex(24)}"

    @staticmethod
    def compute_signature(secret: str, timestamp: int, payload_bytes: bytes) -> str:
        """
        Computes standard HMAC-SHA256 signature for payload verification:
        format: t={timestamp},v1={hex_digest}
        """
        signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
        signature = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return f"t={timestamp},v1={signature}"

    @staticmethod
    def verify_signature(secret: str, signature_header: str, payload_bytes: bytes, tolerance_seconds: int = 300) -> bool:
        """Verifies received HMAC-SHA256 signature against webhook secret."""
        try:
            elements = signature_header.split(",")
            timestamp_str = None
            signature_hash = None
            for elem in elements:
                if elem.startswith("t="):
                    timestamp_str = elem.split("t=")[1]
                elif elem.startswith("v1="):
                    signature_hash = elem.split("v1=")[1]

            if not timestamp_str or not signature_hash:
                return False

            timestamp = int(timestamp_str)
            if tolerance_seconds and abs(int(time.time()) - timestamp) > tolerance_seconds:
                return False

            expected_sig = hmac.new(
                secret.encode("utf-8"),
                f"{timestamp}.".encode("utf-8") + payload_bytes,
                hashlib.sha256
            ).hexdigest()

            return secrets.compare_digest(signature_hash, expected_sig)
        except Exception:
            return False

    def get_active_subscriptions_for_event(self, event_name: str) -> list:
        """Retrieves all active webhook subscriptions subscribed to a specific event or wildcard '*'."""
        subscriptions = query_all("SELECT * FROM webhook_subscriptions WHERE is_active = 1")
        matching = []
        for sub in subscriptions:
            try:
                events = json.loads(sub["events_json"]) if sub.get("events_json") else ["*"]
            except Exception:
                events = ["*"]
            if "*" in events or event_name in events:
                matching.append(sub)
        return matching

    def deliver_to_subscription(self, subscription: dict, event_name: str, payload_dict: dict, delivery_id: int = None) -> dict:
        """
        Performs HTTP POST delivery of a webhook event to a subscription endpoint,
        computes HMAC-SHA256 headers, measures latency, and records audit delivery record.
        """
        sub_id = subscription["id"]
        target_url = subscription["url"]
        secret = subscription.get("secret") or "whsec_default"

        timestamp = int(time.time())
        event_id = f"evt_{secrets.token_hex(12)}"
        envelope = {
            "id": event_id,
            "event": event_name,
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "data": payload_dict
        }
        payload_bytes = json.dumps(envelope, separators=(',', ':'), default=str).encode("utf-8")
        signature = self.compute_signature(secret, timestamp, payload_bytes)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "NovaDrop-Webhooks/1.0",
            "X-NovaDrop-Event": event_name,
            "X-NovaDrop-Delivery": event_id,
            "X-NovaDrop-Timestamp": str(timestamp),
            "X-NovaDrop-Signature": signature
        }

        start_time = time.time()
        status_code = None
        response_body = ""
        is_success = 0
        error_message = None

        try:
            resp = requests.post(target_url, data=payload_bytes, headers=headers, timeout=5)
            latency_ms = int((time.time() - start_time) * 1000)
            status_code = resp.status_code
            response_body = resp.text[:1000] if resp.text else ""
            is_success = 1 if (200 <= resp.status_code < 300) else 0
            if not is_success:
                error_message = f"HTTP {resp.status_code}: {response_body[:200]}"
        except requests.exceptions.Timeout:
            latency_ms = int((time.time() - start_time) * 1000)
            error_message = "Connection timed out after 5000ms"
        except requests.exceptions.ConnectionError as ce:
            latency_ms = int((time.time() - start_time) * 1000)
            error_message = f"Connection failed: {str(ce)[:200]}"
        except Exception as ex:
            latency_ms = int((time.time() - start_time) * 1000)
            error_message = f"Delivery error: {str(ex)[:200]}"

        # Record delivery log
        recorded_id = execute_write(
            """INSERT INTO webhook_deliveries (
                   subscription_id, event_name, payload_json, status_code,
                   response_body, is_success, latency_ms, error_message, attempt
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sub_id,
                event_name,
                payload_bytes.decode("utf-8"),
                status_code,
                response_body,
                is_success,
                latency_ms,
                error_message,
                1
            )
        )

        return {
            "delivery_id": recorded_id,
            "subscription_id": sub_id,
            "event": event_name,
            "is_success": bool(is_success),
            "status_code": status_code,
            "latency_ms": latency_ms,
            "error_message": error_message,
            "response_body": response_body
        }

    def dispatch_event(self, event_name: str, payload: dict, sync: bool = False):
        """
        Dispatches an event to all matching active subscriptions.
        Runs asynchronously in background thread pool by default to prevent blocking main request flow.
        """
        subscriptions = self.get_active_subscriptions_for_event(event_name)
        if not subscriptions:
            return []

        if sync:
            results = []
            for sub in subscriptions:
                res = self.deliver_to_subscription(sub, event_name, payload)
                results.append(res)
            return results

        # Asynchronous background execution
        for sub in subscriptions:
            self._executor.submit(self.deliver_to_subscription, sub, event_name, payload)

        return len(subscriptions)

    def send_test_ping(self, subscription_id: int) -> dict:
        """Sends a synchronous diagnostic test event to a single subscription."""
        subscription = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (subscription_id,))
        if not subscription:
            raise ValueError(f"Webhook subscription #{subscription_id} not found.")

        test_payload = {
            "message": "NovaDrop test webhook event ping",
            "subscription_id": subscription_id,
            "url": subscription["url"],
            "pinged_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        }

        return self.deliver_to_subscription(subscription, "test.ping", test_payload)

    def resend_delivery(self, delivery_id: int) -> dict:
        """Re-dispatches a previously logged delivery payload."""
        delivery = query_one("SELECT * FROM webhook_deliveries WHERE id = ?", (delivery_id,))
        if not delivery:
            raise ValueError(f"Webhook delivery record #{delivery_id} not found.")

        subscription = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (delivery["subscription_id"],))
        if not subscription:
            raise ValueError(f"Parent webhook subscription #{delivery['subscription_id']} no longer exists.")

        try:
            envelope = json.loads(delivery["payload_json"])
            data_payload = envelope.get("data", {})
        except Exception:
            data_payload = {"raw": delivery["payload_json"]}

        return self.deliver_to_subscription(subscription, delivery["event_name"], data_payload)

webhook_service = WebhookService()
