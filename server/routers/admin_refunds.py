import json
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import require_auth, log_audit

admin_refunds_bp = Blueprint("admin_refunds", __name__)

@admin_refunds_bp.route("/refunds", methods=["GET"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def list_refunds():
    user = g.current_user
    where_clauses = ["1=1"]
    params = []

    if user["role"] == "supplier":
        sup = query_one("SELECT id FROM suppliers WHERE user_id = ? OR email = ?", (user["id"], user["email"]))
        if sup:
            where_clauses.append("rd.supplier_id = ?")
            params.append(sup["id"])

    where_sql = " AND ".join(where_clauses)
    sql = f"""
        SELECT rd.*, o.order_number, o.total_amount as order_total, o.customer_email, o.customer_name,
               s.name as supplier_name
        FROM refund_disputes rd
        JOIN orders o ON rd.order_id = o.id
        LEFT JOIN suppliers s ON rd.supplier_id = s.id
        WHERE {where_sql}
        ORDER BY rd.created_at DESC
    """
    disputes = query_all(sql, params)
    for d in disputes:
        try:
            d["proof_images"] = json.loads(d["proof_images_json"]) if d["proof_images_json"] else []
        except Exception:
            d["proof_images"] = []
    return jsonify({"refunds": disputes})

@admin_refunds_bp.route("/refunds/<int:dispute_id>/status", methods=["PUT"])
@require_auth(allowed_roles=["admin", "merchant"])
def update_refund_status(dispute_id):
    dispute = query_one("SELECT * FROM refund_disputes WHERE id = ?", (dispute_id,))
    if not dispute:
        return jsonify({"error": "Dispute not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "approved").strip().lower() # approved, rejected, refunded
    refund_amount = float(data.get("refund_amount", dispute["requested_amount"]))
    admin_notes = data.get("admin_notes", "").strip()

    if new_status not in ["under_review", "approved", "rejected", "refunded"]:
        return jsonify({"error": "Invalid dispute status."}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE refund_disputes SET
                status = ?, refund_amount = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (new_status, refund_amount, admin_notes, dispute_id)
        )

        if new_status in ["approved", "refunded"]:
            order = query_one("SELECT * FROM orders WHERE id = ?", (dispute["order_id"],))
            if order:
                pay_status = "refunded" if refund_amount >= order["total_amount"] else "partially_refunded"
                cursor.execute(
                    "UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (pay_status, dispute["order_id"])
                )

    log_audit("REFUND_PROCESSED", "refund_disputes", dispute_id, {
        "status": new_status,
        "refund_amount": refund_amount
    })

    return jsonify({"message": f"Refund dispute has been marked as {new_status}.", "status": new_status})
