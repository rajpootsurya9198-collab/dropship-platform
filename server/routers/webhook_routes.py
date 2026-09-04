import json
from flask import Blueprint, request, jsonify
from ..services.payment_service import payment_service
from ..db import query_one, execute_write
from ..security import log_audit

webhook_bp = Blueprint("webhooks", __name__)

@webhook_bp.route("/payment", methods=["POST"])
def payment_webhook():
    raw_payload = request.get_data()
    signature_header = request.headers.get("Stripe-Signature", "")
    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")

    try:
        result = payment_service.handle_webhook_event(
            raw_payload=raw_payload,
            signature_header=signature_header,
            idempotency_key=idempotency_key
        )
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "Internal webhook processing error"}), 500

@webhook_bp.route("/supplier", methods=["POST"])
def supplier_webhook():
    data = request.get_json() or {}
    supplier_order_id = data.get("supplier_order_id")
    tracking_number = data.get("tracking_number")
    carrier = data.get("carrier", "YunExpress")
    stage = data.get("status_stage", "in_transit")
    location = data.get("location", "Transit Hub")
    description = data.get("description", "Package in transit")

    if not tracking_number:
        return jsonify({"error": "tracking_number is required"}), 400

    fulfillment = query_one("SELECT * FROM fulfillments WHERE tracking_number = ?", (tracking_number,))
    if fulfillment:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        execute_write(
            """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
               VALUES (?, ?, ?, ?, ?)""",
            (fulfillment["id"], stage, location, description, now_str)
        )
        if stage == "delivered":
            execute_write(
                "UPDATE fulfillments SET status = 'delivered', delivered_at = ? WHERE id = ?",
                (now_str, fulfillment["id"])
            )
            execute_write(
                "UPDATE orders SET order_status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (fulfillment["order_id"],)
            )

        log_audit("SUPPLIER_WEBHOOK_PROCESSED", "fulfillments", fulfillment["id"], {"tracking": tracking_number, "stage": stage})

    return jsonify({"status": "received", "tracking_number": tracking_number}), 200
