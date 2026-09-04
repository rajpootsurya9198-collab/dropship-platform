import json
import random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import require_auth, log_audit

admin_orders_bp = Blueprint("admin_orders", __name__)

@admin_orders_bp.route("/orders", methods=["GET"])
@require_auth(allowed_roles=["admin", "merchant", "supplier", "staff"])
def list_orders():
    user = g.current_user
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip()
    page = max(1, request.args.get("page", 1, type=int))
    limit = min(50, max(1, request.args.get("limit", 20, type=int)))
    offset = (page - 1) * limit

    where_clauses = ["1=1"]
    params = []

    # If supplier, only show orders containing items routed to this supplier
    if user["role"] == "supplier":
        sup = query_one("SELECT id FROM suppliers WHERE user_id = ? OR email = ?", (user["id"], user["email"]))
        if sup:
            where_clauses.append("o.id IN (SELECT DISTINCT order_id FROM order_items WHERE supplier_id = ?)")
            params.append(sup["id"])

    if status:
        where_clauses.append("o.order_status = ?")
        params.append(status)

    if search:
        where_clauses.append("(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)")
        pat = f"%{search}%"
        params.extend([pat, pat, pat])

    where_sql = " AND ".join(where_clauses)
    
    count_sql = f"SELECT COUNT(o.id) as total FROM orders o WHERE {where_sql}"
    total_count = query_one(count_sql, params)["total"]

    sql = f"""
        SELECT o.*,
               (SELECT COUNT(oi.id) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
               (SELECT SUM(oi.cost_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_cost
        FROM orders o
        WHERE {where_sql}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    orders = query_all(sql, params)

    for o in orders:
        try:
            o["shipping_address"] = json.loads(o["shipping_address_json"])
        except Exception:
            o["shipping_address"] = {}

        cost = o["total_cost"] or 0.0
        profit = round(o["total_amount"] - cost, 2)
        margin_pct = round((profit / o["total_amount"] * 100) if o["total_amount"] > 0 else 0, 1)
        o["profit_margin_usd"] = profit
        o["profit_margin_percent"] = margin_pct

        # Fulfillments
        fulfillments = query_all(
            """SELECT f.*, s.name as supplier_name
               FROM fulfillments f
               JOIN suppliers s ON f.supplier_id = s.id
               WHERE f.order_id = ?""",
            (o["id"],)
        )
        o["fulfillments"] = fulfillments

    return jsonify({
        "orders": orders,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    })

@admin_orders_bp.route("/orders/<int:order_id>", methods=["GET"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def get_order_details(order_id):
    order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    try:
        order["shipping_address"] = json.loads(order["shipping_address_json"])
    except Exception:
        order["shipping_address"] = {}

    try:
        order["billing_address"] = json.loads(order["billing_address_json"]) if order.get("billing_address_json") else order["shipping_address"]
    except Exception:
        order["billing_address"] = order["shipping_address"]

    items = query_all(
        """SELECT oi.*, p.images_json, p.slug as product_slug, s.name as supplier_name, s.shipping_origin, s.fulfillment_sla_days
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN suppliers s ON oi.supplier_id = s.id
           WHERE oi.order_id = ?""",
        (order_id,)
    )
    for it in items:
        try:
            imgs = json.loads(it["images_json"]) if it["images_json"] else []
            it["primary_image"] = imgs[0] if imgs else ""
        except Exception:
            it["primary_image"] = ""
    order["items"] = items

    fulfillments = query_all(
        """SELECT f.*, s.name as supplier_name, s.shipping_origin
           FROM fulfillments f
           JOIN suppliers s ON f.supplier_id = s.id
           WHERE f.order_id = ?""",
        (order_id,)
    )

    for ful in fulfillments:
        events = query_all(
            "SELECT * FROM tracking_events WHERE fulfillment_id = ? ORDER BY checkpoint_time ASC",
            (ful["id"],)
        )
        ful["tracking_events"] = events
    order["fulfillments"] = fulfillments

    order["disputes"] = query_all("SELECT * FROM refund_disputes WHERE order_id = ?", (order_id,))

    return jsonify({"order": order})

@admin_orders_bp.route("/orders/<int:order_id>/status", methods=["PUT"])
@require_auth(allowed_roles=["admin", "merchant"])
def update_order_status(order_id):
    order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()
    valid_statuses = ["pending", "processing", "partially_shipped", "shipped", "delivered", "cancelled", "disputed"]
    
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    execute_write(
        "UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_status, order_id)
    )

    log_audit("ORDER_STATUS_CHANGED", "orders", order_id, {
        "order_number": order["order_number"],
        "old_status": order["order_status"],
        "new_status": new_status
    })

    return jsonify({"message": f"Order status updated to {new_status}.", "order_status": new_status})

@admin_orders_bp.route("/orders/<int:order_id>/fulfill", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def dispatch_fulfillment(order_id):
    order = query_one("SELECT * FROM orders WHERE id = ?", (order_id,))
    if not order:
        return jsonify({"error": "Order not found."}), 404

    data = request.get_json() or {}
    fulfillment_id = data.get("fulfillment_id")
    supplier_id = data.get("supplier_id")
    carrier = data.get("carrier", "YunExpress").strip()
    tracking_number = data.get("tracking_number", "").strip()
    service_level = data.get("carrier_service", "Priority Express").strip()

    if not tracking_number:
        # Auto-generate carrier tracking format
        tracking_number = f"{carrier.upper()[:3]}-{random.randint(10000000, 99999999)}US"

    now = datetime.now()
    shipped_at = now.strftime("%Y-%m-%d %H:%M:%S")
    est_delivery = (now + timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()

        if fulfillment_id:
            cursor.execute(
                """UPDATE fulfillments SET
                    carrier = ?, carrier_service = ?, tracking_number = ?,
                    status = 'in_transit', shipped_at = ?, estimated_delivery_at = ?
                   WHERE id = ? AND order_id = ?""",
                (carrier, service_level, tracking_number, shipped_at, est_delivery, fulfillment_id, order_id)
            )
            ful_target_id = fulfillment_id
        else:
            # Create new fulfillment
            if not supplier_id:
                first_sup = query_one("SELECT supplier_id FROM order_items WHERE order_id = ? LIMIT 1", (order_id,))
                supplier_id = first_sup["supplier_id"] if first_sup else 1

            ful_num = f"FUL-{order['order_number'].replace('ORD-', '')}-{random.randint(1, 9)}"
            cursor.execute(
                """INSERT INTO fulfillments (
                    order_id, supplier_id, fulfillment_number, tracking_number,
                    carrier, carrier_service, status, shipped_at, estimated_delivery_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'in_transit', ?, ?, ?)""",
                (order_id, supplier_id, ful_num, tracking_number, carrier, service_level, shipped_at, est_delivery, shipped_at)
            )
            ful_target_id = cursor.lastrowid

        # Add milestone tracking event
        cursor.execute(
            """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
               VALUES (?, 'departed_facility', 'International Outbound Hub', ?, ?)""",
            (ful_target_id, f"Package dispatched via {carrier} with tracking #{tracking_number}.", shipped_at)
        )

        # Update order status to shipped
        cursor.execute(
            "UPDATE orders SET order_status = 'shipped', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (order_id,)
        )
        cursor.execute(
            "UPDATE order_items SET status = 'shipped' WHERE order_id = ?",
            (order_id,)
        )

    log_audit("FULFILLMENT_DISPATCHED", "fulfillments", ful_target_id, {
        "order_number": order["order_number"],
        "carrier": carrier,
        "tracking_number": tracking_number
    })

    return jsonify({
        "message": f"Order {order['order_number']} dispatched with {carrier} tracking {tracking_number}.",
        "tracking_number": tracking_number,
        "carrier": carrier,
        "order_status": "shipped"
    })

@admin_orders_bp.route("/orders/<int:order_id>/add-checkpoint", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def add_tracking_checkpoint(order_id):
    data = request.get_json() or {}
    fulfillment_id = data.get("fulfillment_id")
    status_stage = data.get("status_stage", "in_transit")
    location = data.get("location", "Regional Sorting Depot").strip()
    description = data.get("description", "In transit to delivery destination").strip()

    if not fulfillment_id:
        ful = query_one("SELECT id FROM fulfillments WHERE order_id = ? LIMIT 1", (order_id,))
        if not ful:
            return jsonify({"error": "No fulfillment record found for this order."}), 404
        fulfillment_id = ful["id"]

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    execute_write(
        """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
           VALUES (?, ?, ?, ?, ?)""",
        (fulfillment_id, status_stage, location, description, now_str)
    )

    if status_stage == "delivered":
        execute_write(
            "UPDATE fulfillments SET status = 'delivered', delivered_at = ? WHERE id = ?",
            (now_str, fulfillment_id)
        )
        execute_write(
            "UPDATE orders SET order_status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (order_id,)
        )

    return jsonify({"message": "Tracking checkpoint logged.", "status_stage": status_stage})

@admin_orders_bp.route("/orders/<int:order_id>/notes", methods=["PUT"])
@require_auth(allowed_roles=["admin", "merchant"])
def update_admin_notes(order_id):
    data = request.get_json() or {}
    notes = data.get("admin_notes", "").strip()
    execute_write("UPDATE orders SET admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (notes, order_id))
    return jsonify({"message": "Notes updated."})
