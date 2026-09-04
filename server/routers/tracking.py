import json
from flask import Blueprint, request, jsonify
from ..db import query_all, query_one

tracking_bp = Blueprint("tracking", __name__)

@tracking_bp.route("/search", methods=["GET"])
@tracking_bp.route("/<identifier>", methods=["GET"])
def track_package(identifier=None):
    query = identifier or request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Order number or tracking number is required."}), 400

    # 1. Search by tracking number in fulfillments
    fulfillment = query_one(
        """SELECT f.*, o.order_number, o.customer_name, o.shipping_address_json, o.order_status,
                  s.name as supplier_name, s.shipping_origin, s.country as supplier_country
           FROM fulfillments f
           JOIN orders o ON f.order_id = o.id
           JOIN suppliers s ON f.supplier_id = s.id
           WHERE f.tracking_number = ? OR f.fulfillment_number = ?""",
        (query, query)
    )

    if fulfillment:
        events = query_all(
            "SELECT * FROM tracking_events WHERE fulfillment_id = ? ORDER BY checkpoint_time ASC",
            (fulfillment["id"],)
        )
        try:
            addr = json.loads(fulfillment["shipping_address_json"])
        except Exception:
            addr = {}

        # Items in this fulfillment
        items = query_all(
            """SELECT oi.*, p.images_json
               FROM order_items oi
               LEFT JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = ? AND oi.supplier_id = ?""",
            (fulfillment["order_id"], fulfillment["supplier_id"])
        )
        for item in items:
            try:
                imgs = json.loads(item["images_json"]) if item["images_json"] else []
                item["primary_image"] = imgs[0] if imgs else ""
            except Exception:
                item["primary_image"] = ""

        # Calculate progress percent
        stage_weights = {
            "order_placed": 15,
            "supplier_confirmed": 30,
            "label_created": 45,
            "departed_facility": 60,
            "in_transit": 75,
            "customs_cleared": 85,
            "out_for_delivery": 95,
            "delivered": 100
        }
        current_stage = events[-1]["status_stage"] if events else "order_placed"
        progress_pct = stage_weights.get(current_stage, 20)

        return jsonify({
            "found": True,
            "type": "fulfillment",
            "order_number": fulfillment["order_number"],
            "fulfillment_number": fulfillment["fulfillment_number"],
            "tracking_number": fulfillment["tracking_number"],
            "carrier": fulfillment["carrier"],
            "carrier_service": fulfillment["carrier_service"],
            "status": fulfillment["status"],
            "current_stage": current_stage,
            "progress_percent": progress_pct,
            "origin": fulfillment["shipping_origin"],
            "destination": f"{addr.get('city', '')}, {addr.get('state', '')} {addr.get('country', '')}",
            "recipient_name": addr.get("full_name", fulfillment["customer_name"]),
            "shipped_at": fulfillment["shipped_at"],
            "estimated_delivery_at": fulfillment["estimated_delivery_at"],
            "delivered_at": fulfillment["delivered_at"],
            "items": items,
            "events": events
        })

    # 2. Search by Order Number
    order = query_one("SELECT * FROM orders WHERE order_number = ?", (query,))
    if order:
        fulfillments = query_all(
            """SELECT f.*, s.name as supplier_name, s.shipping_origin, s.country as supplier_country
               FROM fulfillments f
               JOIN suppliers s ON f.supplier_id = s.id
               WHERE f.order_id = ?""",
            (order["id"],)
        )
        
        try:
            addr = json.loads(order["shipping_address_json"])
        except Exception:
            addr = {}

        items = query_all(
            """SELECT oi.*, p.images_json
               FROM order_items oi
               LEFT JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = ?""",
            (order["id"],)
        )
        for item in items:
            try:
                imgs = json.loads(item["images_json"]) if item["images_json"] else []
                item["primary_image"] = imgs[0] if imgs else ""
            except Exception:
                item["primary_image"] = ""

        ful_list = []
        for ful in fulfillments:
            events = query_all(
                "SELECT * FROM tracking_events WHERE fulfillment_id = ? ORDER BY checkpoint_time ASC",
                (ful["id"],)
            )
            ful["events"] = events
            ful_list.append(ful)

        return jsonify({
            "found": True,
            "type": "order",
            "order_number": order["order_number"],
            "order_status": order["order_status"],
            "customer_name": order["customer_name"],
            "destination": f"{addr.get('city', '')}, {addr.get('state', '')} {addr.get('country', '')}",
            "created_at": order["created_at"],
            "items": items,
            "fulfillments": ful_list
        })

    return jsonify({"found": False, "error": f"No tracking details or order found for '{query}'."}), 404
