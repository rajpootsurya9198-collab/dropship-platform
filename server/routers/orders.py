import json
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import require_auth, optional_auth, log_audit

orders_bp = Blueprint("orders", __name__)

@orders_bp.route("/my-orders", methods=["GET"])
@require_auth()
def get_my_orders():
    user_id = g.current_user["id"]
    user_email = g.current_user["email"]

    orders = query_all(
        """SELECT * FROM orders
           WHERE user_id = ? OR customer_email = ?
           ORDER BY created_at DESC""",
        (user_id, user_email)
    )

    for o in orders:
        try:
            o["shipping_address"] = json.loads(o["shipping_address_json"])
        except Exception:
            o["shipping_address"] = {}

        # Items
        items = query_all(
            """SELECT oi.*, p.images_json, p.slug as product_slug
               FROM order_items oi
               LEFT JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = ?""",
            (o["id"],)
        )
        for item in items:
            try:
                imgs = json.loads(item["images_json"]) if item["images_json"] else []
                item["primary_image"] = imgs[0] if imgs else ""
            except Exception:
                item["primary_image"] = ""
        o["items"] = items

        # Fulfillments
        fulfillments = query_all(
            "SELECT * FROM fulfillments WHERE order_id = ? ORDER BY id ASC",
            (o["id"],)
        )
        o["fulfillments"] = fulfillments

        # Active dispute if any
        dispute = query_one("SELECT * FROM refund_disputes WHERE order_id = ?", (o["id"],))
        o["dispute"] = dispute

    return jsonify({"orders": orders})

@orders_bp.route("/<order_number>", methods=["GET"])
@optional_auth
def get_order_detail(order_number):
    order = query_one("SELECT * FROM orders WHERE order_number = ?", (order_number,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    # If logged in as customer, ensure they own the order or are admin/merchant
    if getattr(g, "current_user", None):
        user = g.current_user
        if user["role"] == "customer" and order["user_id"] != user["id"] and order["customer_email"] != user["email"]:
            return jsonify({"error": "Access denied to this order."}), 403

    try:
        order["shipping_address"] = json.loads(order["shipping_address_json"])
    except Exception:
        order["shipping_address"] = {}

    try:
        order["billing_address"] = json.loads(order["billing_address_json"]) if order.get("billing_address_json") else order["shipping_address"]
    except Exception:
        order["billing_address"] = order["shipping_address"]

    items = query_all(
        """SELECT oi.*, p.images_json, p.slug as product_slug, s.name as supplier_name, s.shipping_origin
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN suppliers s ON oi.supplier_id = s.id
           WHERE oi.order_id = ?""",
        (order["id"],)
    )
    for item in items:
        try:
            imgs = json.loads(item["images_json"]) if item["images_json"] else []
            item["primary_image"] = imgs[0] if imgs else ""
        except Exception:
            item["primary_image"] = ""
    order["items"] = items

    fulfillments = query_all(
        """SELECT f.*, s.name as supplier_name, s.shipping_origin
           FROM fulfillments f
           JOIN suppliers s ON f.supplier_id = s.id
           WHERE f.order_id = ?""",
        (order["id"],)
    )

    for ful in fulfillments:
        events = query_all(
            "SELECT * FROM tracking_events WHERE fulfillment_id = ? ORDER BY checkpoint_time ASC",
            (ful["id"],)
        )
        ful["tracking_events"] = events

    order["fulfillments"] = fulfillments
    order["disputes"] = query_all("SELECT * FROM refund_disputes WHERE order_id = ?", (order["id"],))

    return jsonify({"order": order})

@orders_bp.route("/<order_number>/cancel", methods=["POST"])
@require_auth()
def cancel_order(order_number):
    order = query_one("SELECT * FROM orders WHERE order_number = ?", (order_number,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    user = g.current_user
    if user["role"] == "customer" and order["user_id"] != user["id"] and order["customer_email"] != user["email"]:
        return jsonify({"error": "Access denied."}), 403

    if order["order_status"] in ["shipped", "delivered", "cancelled"]:
        return jsonify({"error": f"Cannot cancel order with status '{order['order_status']}'."}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "Customer requested cancellation before fulfillment.").strip()

    # Cancel order and restore inventory
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET order_status = 'cancelled', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (reason, order["id"])
        )
        cursor.execute(
            "UPDATE order_items SET status = 'cancelled' WHERE order_id = ?",
            (order["id"],)
        )

        # Restore inventory
        items = query_all("SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?", (order["id"],))
        for item in items:
            if item["variant_id"]:
                cursor.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?",
                    (item["quantity"], item["variant_id"])
                )
            cursor.execute(
                "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
                (item["quantity"], item["product_id"])
            )

    log_audit("ORDER_CANCELLED", "orders", order["id"], {"order_number": order_number, "reason": reason})

    try:
        from ..services.webhook_service import webhook_service
        webhook_service.dispatch_event("order.cancelled", {
            "order_id": order["id"],
            "order_number": order_number,
            "reason": reason,
            "customer_email": order["customer_email"],
            "cancelled_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        print(f"Webhook dispatch error on cancel: {e}")

    return jsonify({"message": f"Order {order_number} has been cancelled and inventory restored.", "order_status": "cancelled"})

@orders_bp.route("/<order_number>/request-refund", methods=["POST"])
@require_auth()
def request_refund(order_number):
    order = query_one("SELECT * FROM orders WHERE order_number = ?", (order_number,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    user = g.current_user
    if user["role"] == "customer" and order["user_id"] != user["id"] and order["customer_email"] != user["email"]:
        return jsonify({"error": "Access denied."}), 403

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    details = data.get("details", "").strip()
    requested_amount = float(data.get("requested_amount", order["total_amount"]))
    proof_image = data.get("proof_image", "").strip()

    if not reason or not details:
        return jsonify({"error": "Refund reason and specific details are required."}), 400

    requested_amount = min(requested_amount, order["total_amount"])

    # Find supplier from first item
    first_item = query_one("SELECT supplier_id, id FROM order_items WHERE order_id = ? LIMIT 1", (order["id"],))
    supplier_id = first_item["supplier_id"] if first_item else None
    item_id = first_item["id"] if first_item else None

    proof_json = json.dumps([proof_image]) if proof_image else '[]'

    dispute_id = execute_write(
        """INSERT INTO refund_disputes (
            order_id, order_item_id, user_id, supplier_id, reason, details,
            requested_amount, status, proof_images_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'under_review', ?)""",
        (order["id"], item_id, user["id"], supplier_id, reason, details, requested_amount, proof_json)
    )

    execute_write(
        "UPDATE orders SET order_status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (order["id"],)
    )

    log_audit("REFUND_REQUESTED", "refund_disputes", dispute_id, {
        "order_number": order_number,
        "requested_amount": requested_amount,
        "reason": reason
    })

    try:
        from ..services.webhook_service import webhook_service
        webhook_service.dispatch_event("refund.requested", {
            "dispute_id": dispute_id,
            "order_id": order["id"],
            "order_number": order_number,
            "requested_amount": requested_amount,
            "reason": reason,
            "customer_email": order["customer_email"]
        })
    except Exception as e:
        print(f"Webhook dispatch error on refund: {e}")

    return jsonify({
        "message": "Refund and return dispute submitted. Our dropship support team and supplier will review within 24 hours.",
        "dispute_id": dispute_id,
        "status": "under_review"
    }), 201
