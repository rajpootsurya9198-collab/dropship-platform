import hashlib
import os
import json
import secrets
import random
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ..db import query_one, query_all, execute_write, get_db

class SupplierProvider(ABC):
    """Abstract Interface for Dropship Supplier APIs (AliExpress, CJ, Direct Factory)"""

    @abstractmethod
    def get_products(self) -> List[dict]:
        pass

    @abstractmethod
    def create_supplier_order(self, order_number: str, items: List[dict], shipping_address: dict) -> dict:
        pass

    @abstractmethod
    def get_order_status(self, supplier_order_id: str) -> dict:
        pass

    @abstractmethod
    def cancel_supplier_order(self, supplier_order_id: str) -> dict:
        pass

    @abstractmethod
    def sync_inventory(self) -> List[dict]:
        pass


class ApexTechSupplierProvider(SupplierProvider):
    """Factory API Adapter for ApexTech Global (Shenzhen Electronics Logistics)"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("SUPPLIER_APEX_API_KEY", "demo_apex_key")
        self.endpoint = os.environ.get("SUPPLIER_APEX_ENDPOINT", "https://api.apextech.com/v2/dropship")

    def get_products(self) -> List[dict]:
        return [
            {"sku": "AUR-ANC-PRO", "stock": 185, "wholesale_cost": 28.50},
            {"sku": "LUM-BAR-01", "stock": 240, "wholesale_cost": 14.20},
            {"sku": "VAN-WAL-01", "stock": 420, "wholesale_cost": 9.80}
        ]

    def create_supplier_order(self, order_number: str, items: List[dict], shipping_address: dict) -> dict:
        supplier_order_id = f"APEX-ORD-{secrets.token_hex(6).upper()}"
        tracking_number = f"YUN-{random.randint(10000000, 99999999)}US"
        return {
            "success": True,
            "supplier_order_id": supplier_order_id,
            "carrier": "YunExpress",
            "tracking_number": tracking_number,
            "estimated_dispatch_hours": 24,
            "shipping_label_url": f"https://labels.apextech.com/{supplier_order_id}.pdf"
        }

    def get_order_status(self, supplier_order_id: str) -> dict:
        return {
            "supplier_order_id": supplier_order_id,
            "status": "in_transit",
            "carrier": "YunExpress",
            "last_location": "Shenzhen Bao'an Air Cargo Hub",
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def cancel_supplier_order(self, supplier_order_id: str) -> dict:
        return {"success": True, "status": "cancelled", "supplier_order_id": supplier_order_id}

    def sync_inventory(self) -> List[dict]:
        return self.get_products()


class SupplierService:
    """Enterprise Supplier Dispatch & Synchronization Engine"""

    def __init__(self):
        self.providers: Dict[str, SupplierProvider] = {
            "SUP-APEX-01": ApexTechSupplierProvider()
        }

    def get_provider(self, supplier_code: str) -> SupplierProvider:
        return self.providers.get(supplier_code, ApexTechSupplierProvider())

    def dispatch_supplier_order(self, order_id: int, supplier_id: int) -> dict:
        order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        supplier = query_one("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
        if not order or not supplier:
            raise ValueError("Order or supplier not found.")

        # Get items for this supplier in this order
        items = query_all("SELECT * FROM order_items WHERE order_id = ? AND supplier_id = ?", (order_id, supplier_id))
        if not items:
            return {"status": "no_items"}

        provider = self.get_provider(supplier["code"])
        try:
            addr = json.loads(order["shipping_address_json"])
        except Exception:
            addr = {}

        result = provider.create_supplier_order(order["order_number"], items, addr)
        
        now = datetime.now()
        shipped_at = now.strftime("%Y-%m-%d %H:%M:%S")
        est_delivery = (now + timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")
        
        ful_number = f"FUL-{order['order_number'].replace('ORD-', '')}-{random.randint(10, 99)}"

        # Save Fulfillment
        ful_id = execute_write(
            """INSERT INTO fulfillments (
                order_id, supplier_id, fulfillment_number, tracking_number,
                carrier, carrier_service, status, shipped_at, estimated_delivery_at, created_at
            ) VALUES (?, ?, ?, ?, ?, 'Priority Line', 'in_transit', ?, ?, ?)""",
            (
                order_id, supplier_id, ful_number, result["tracking_number"],
                result["carrier"], shipped_at, est_delivery, shipped_at
            )
        )

        # Log Milestone
        execute_write(
            """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
               VALUES (?, 'label_created', ?, ?, ?)""",
            (
                ful_id, supplier["shipping_origin"],
                f"Air Waybill generated with {result['carrier']} (Tracking #{result['tracking_number']}).",
                shipped_at
            )
        )

        return {
            "fulfillment_id": ful_id,
            "supplier_order_id": result["supplier_order_id"],
            "tracking_number": result["tracking_number"],
            "carrier": result["carrier"]
        }

    def sync_all_supplier_inventory(self) -> dict:
        """Periodic automated background stock synchronization"""
        updated_count = 0
        for code, provider in self.providers.items():
            stock_feed = provider.sync_inventory()
            with get_db() as conn:
                cursor = conn.cursor()
                for feed in stock_feed:
                    cursor.execute(
                        "UPDATE products SET stock_quantity = ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?",
                        (feed["stock"], feed["wholesale_cost"], feed["sku"])
                    )
                    updated_count += 1

        return {"status": "synced", "items_updated": updated_count}

supplier_service = SupplierService()
