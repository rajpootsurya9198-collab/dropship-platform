import json
import secrets
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..services.payment_service import payment_service
from ..services.webhook_service import webhook_service, SUPPORTED_EVENTS
from ..db import query_all, query_one, execute_write
from ..security import log_audit, require_permission

webhook_bp = Blueprint("webhooks", __name__)

# =====================================================================
# INBOUND WEBHOOK ENDPOINTS
# =====================================================================

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
        # If payment succeeded, notify outbound subscribers
        if result.get("status") == "success" and result.get("event_type") == "payment_intent.succeeded":
            try:
                event_data = json.loads(raw_payload.decode("utf-8"))
                webhook_service.dispatch_event("order.paid", event_data.get("data", {}).get("object", {}))
            except Exception:
                pass
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

        # Outbound notification
        webhook_service.dispatch_event("tracking.updated", {
            "tracking_number": tracking_number,
            "carrier": carrier,
            "status_stage": stage,
            "location": location,
            "description": description,
            "fulfillment_id": fulfillment["id"],
            "order_id": fulfillment["order_id"],
            "checkpoint_time": now_str
        })

    return jsonify({"status": "received", "tracking_number": tracking_number}), 200

@webhook_bp.route("/test-receiver", methods=["POST"])
def test_receiver():
    """Mock destination endpoint for local/sandbox testing of outbound webhooks."""
    raw_payload = request.get_data()
    signature = request.headers.get("X-NovaDrop-Signature", "")
    event_name = request.headers.get("X-NovaDrop-Event", "unknown")
    delivery_id = request.headers.get("X-NovaDrop-Delivery", "")
    timestamp = request.headers.get("X-NovaDrop-Timestamp", "")

    try:
        body = json.loads(raw_payload.decode("utf-8"))
    except Exception:
        body = {"raw": raw_payload.decode("utf-8", errors="ignore")}

    return jsonify({
        "status": "success",
        "message": "Webhook payload received successfully by test receiver",
        "event": event_name,
        "delivery_id": delivery_id,
        "timestamp": timestamp,
        "signature_present": bool(signature),
        "data_summary": body.get("data") if isinstance(body, dict) else {}
    }), 200


# =====================================================================
# OUTBOUND WEBHOOK SUBSCRIPTIONS & DELIVERIES (ADMIN/MERCHANT RBAC)
# =====================================================================

@webhook_bp.route("/events", methods=["GET"])
@require_permission("SETTINGS_WRITE")
def get_supported_events():
    """Returns list of supported event types for webhook subscriptions."""
    return jsonify({
        "events": SUPPORTED_EVENTS,
        "descriptions": {
            "order.created": "Triggered when a buyer completes a new order checkout",
            "order.paid": "Triggered when order payment is successfully authorized and captured",
            "order.fulfilled": "Triggered when an order item or sub-package is routed and assigned carrier tracking",
            "order.cancelled": "Triggered when an order is cancelled and inventory is restored",
            "tracking.updated": "Triggered when carrier milestones or tracking checkpoints are recorded",
            "inventory.low_stock": "Triggered when product inventory falls below its configured warning threshold",
            "refund.requested": "Triggered when a customer submits a return or dispute request",
            "test.ping": "Diagnostic ping event triggered manually for endpoint verification"
        }
    }), 200

@webhook_bp.route("/subscriptions", methods=["GET"])
@require_permission("SETTINGS_WRITE")
def list_subscriptions():
    """Lists all registered webhook subscriptions with delivery metrics."""
    subs = query_all("SELECT * FROM webhook_subscriptions ORDER BY created_at DESC")
    results = []
    for s in subs:
        sub_dict = dict(s)
        try:
            sub_dict["events"] = json.loads(s["events_json"]) if s.get("events_json") else ["*"]
        except Exception:
            sub_dict["events"] = ["*"]
        
        # Metrics: total, success, failed
        metrics = query_one("""
            SELECT 
                COUNT(*) AS total_deliveries,
                SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful_deliveries,
                SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) AS failed_deliveries
            FROM webhook_deliveries WHERE subscription_id = ?
        """, (s["id"],))
        
        sub_dict["metrics"] = {
            "total": metrics["total_deliveries"] or 0,
            "success": metrics["successful_deliveries"] or 0,
            "failed": metrics["failed_deliveries"] or 0
        }
        results.append(sub_dict)

    return jsonify({"subscriptions": results}), 200

@webhook_bp.route("/subscriptions", methods=["POST"])
@require_permission("SETTINGS_WRITE")
def create_subscription():
    """Registers a new webhook subscription."""
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "Target URL is required."}), 400

    if not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"error": "Target URL must start with http:// or https://"}), 400

    secret = data.get("secret", "").strip() or webhook_service.generate_secret()
    description = data.get("description", "").strip()
    events = data.get("events", ["*"])
    if not isinstance(events, list) or len(events) == 0:
        events = ["*"]
    
    events_json = json.dumps(events)
    is_active = 1 if data.get("is_active", True) else 0

    sub_id = execute_write(
        """INSERT INTO webhook_subscriptions (url, secret, description, events_json, is_active)
           VALUES (?, ?, ?, ?, ?)""",
        (url, secret, description, events_json, is_active)
    )

    log_audit("WEBHOOK_SUBSCRIPTION_CREATED", "webhook_subscriptions", sub_id, {"url": url, "events": events})

    new_sub = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    new_sub_dict = dict(new_sub)
    new_sub_dict["events"] = events

    return jsonify({"subscription": new_sub_dict, "message": "Webhook subscription created successfully."}), 201

@webhook_bp.route("/subscriptions/<int:sub_id>", methods=["GET"])
@require_permission("SETTINGS_WRITE")
def get_subscription(sub_id):
    """Fetches details of a single webhook subscription along with recent delivery history."""
    sub = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    if not sub:
        return jsonify({"error": "Webhook subscription not found."}), 404

    sub_dict = dict(sub)
    try:
        sub_dict["events"] = json.loads(sub["events_json"]) if sub.get("events_json") else ["*"]
    except Exception:
        sub_dict["events"] = ["*"]

    deliveries = query_all(
        "SELECT * FROM webhook_deliveries WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 20",
        (sub_id,)
    )

    return jsonify({"subscription": sub_dict, "recent_deliveries": deliveries}), 200

@webhook_bp.route("/subscriptions/<int:sub_id>", methods=["PUT"])
@require_permission("SETTINGS_WRITE")
def update_subscription(sub_id):
    """Updates an existing webhook subscription."""
    sub = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    if not sub:
        return jsonify({"error": "Webhook subscription not found."}), 404

    data = request.get_json() or {}
    url = data.get("url", sub["url"]).strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"error": "Target URL must start with http:// or https://"}), 400

    secret = data.get("secret", sub["secret"]).strip()
    description = data.get("description", sub.get("description") or "")
    events = data.get("events")
    events_json = json.dumps(events) if events is not None else sub["events_json"]
    is_active = 1 if data.get("is_active", bool(sub["is_active"])) else 0

    execute_write(
        """UPDATE webhook_subscriptions
           SET url = ?, secret = ?, description = ?, events_json = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (url, secret, description, events_json, is_active, sub_id)
    )

    log_audit("WEBHOOK_SUBSCRIPTION_UPDATED", "webhook_subscriptions", sub_id, {"url": url, "is_active": is_active})

    updated = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    updated_dict = dict(updated)
    try:
        updated_dict["events"] = json.loads(updated["events_json"])
    except Exception:
        updated_dict["events"] = ["*"]

    return jsonify({"subscription": updated_dict, "message": "Webhook subscription updated."}), 200

@webhook_bp.route("/subscriptions/<int:sub_id>", methods=["DELETE"])
@require_permission("SETTINGS_WRITE")
def delete_subscription(sub_id):
    """Deletes a webhook subscription and its associated delivery history."""
    sub = query_one("SELECT * FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    if not sub:
        return jsonify({"error": "Webhook subscription not found."}), 404

    execute_write("DELETE FROM webhook_subscriptions WHERE id = ?", (sub_id,))
    log_audit("WEBHOOK_SUBSCRIPTION_DELETED", "webhook_subscriptions", sub_id, {"url": sub["url"]})

    return jsonify({"success": True, "message": "Webhook subscription deleted successfully."}), 200

@webhook_bp.route("/subscriptions/<int:sub_id>/test", methods=["POST"])
@require_permission("SETTINGS_WRITE")
def test_subscription(sub_id):
    """Sends an immediate test ping event to the subscription URL."""
    try:
        result = webhook_service.send_test_ping(sub_id)
        log_audit("WEBHOOK_TEST_PING_SENT", "webhook_subscriptions", sub_id, result)
        return jsonify({
            "status": "delivered" if result["is_success"] else "failed",
            "details": result
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to deliver test ping: {str(e)}"}), 500

@webhook_bp.route("/deliveries", methods=["GET"])
@require_permission("SETTINGS_WRITE")
def list_deliveries():
    """Lists delivery audit history logs with optional filters."""
    sub_id = request.args.get("subscription_id")
    status = request.args.get("status") # success, failed
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    query = """
        SELECT d.*, s.url, s.description AS subscription_description
        FROM webhook_deliveries d
        JOIN webhook_subscriptions s ON d.subscription_id = s.id
        WHERE 1=1
    """
    params = []
    if sub_id:
        query += " AND d.subscription_id = ?"
        params.append(sub_id)
    if status == "success":
        query += " AND d.is_success = 1"
    elif status == "failed":
        query += " AND d.is_success = 0"

    query += " ORDER BY d.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    deliveries = query_all(query, tuple(params))
    return jsonify({"deliveries": deliveries}), 200

@webhook_bp.route("/deliveries/<int:delivery_id>/resend", methods=["POST"])
@require_permission("SETTINGS_WRITE")
def resend_delivery(delivery_id):
    """Re-attempts delivery of a past webhook event."""
    try:
        result = webhook_service.resend_delivery(delivery_id)
        log_audit("WEBHOOK_DELIVERY_RESENT", "webhook_deliveries", delivery_id, result)
        return jsonify({
            "status": "resent",
            "details": result
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to re-send delivery: {str(e)}"}), 500
