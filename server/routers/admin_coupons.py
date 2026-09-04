from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth, log_audit

admin_coupons_bp = Blueprint("admin_coupons", __name__)

@admin_coupons_bp.route("/coupons", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_coupons():
    if request.method == "GET":
        coupons = query_all("SELECT * FROM coupons ORDER BY id DESC")
        return jsonify({"coupons": coupons})

    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    description = data.get("description", "").strip()
    discount_type = data.get("discount_type", "percentage") # percentage or fixed_amount
    discount_value = float(data.get("discount_value", 10.0))
    min_purchase_amount = float(data.get("min_purchase_amount", 0.0))
    max_discount_amount = float(data.get("max_discount_amount", 0.0)) if data.get("max_discount_amount") else None
    usage_limit = int(data.get("usage_limit", 1000))
    is_active = 1 if data.get("is_active", True) else 0

    if not code:
        return jsonify({"error": "Coupon code is required."}), 400

    existing = query_one("SELECT id FROM coupons WHERE code = ?", (code,))
    if existing:
        return jsonify({"error": f"Coupon code {code} already exists."}), 400

    coupon_id = execute_write(
        """INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, is_active)
    )

    log_audit("COUPON_CREATED", "coupons", coupon_id, {"code": code, "discount_value": discount_value})
    return jsonify({"message": "Coupon created.", "coupon_id": coupon_id}), 201

@admin_coupons_bp.route("/coupons/<int:coupon_id>", methods=["PUT", "DELETE"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_coupon_by_id(coupon_id):
    coupon = query_one("SELECT * FROM coupons WHERE id = ?", (coupon_id,))
    if not coupon:
        return jsonify({"error": "Coupon not found."}), 404

    if request.method == "DELETE":
        execute_write("DELETE FROM coupons WHERE id = ?", (coupon_id,))
        log_audit("COUPON_DELETED", "coupons", coupon_id, {"code": coupon["code"]})
        return jsonify({"message": "Coupon deleted."})

    data = request.get_json() or {}
    code = data.get("code", coupon["code"]).strip().upper()
    description = data.get("description", coupon["description"]).strip()
    discount_type = data.get("discount_type", coupon["discount_type"])
    discount_value = float(data.get("discount_value", coupon["discount_value"]))
    min_purchase_amount = float(data.get("min_purchase_amount", coupon["min_purchase_amount"]))
    max_discount_amount = float(data.get("max_discount_amount", coupon["max_discount_amount"])) if data.get("max_discount_amount") else None
    usage_limit = int(data.get("usage_limit", coupon["usage_limit"]))
    is_active = 1 if data.get("is_active", coupon["is_active"]) else 0

    execute_write(
        """UPDATE coupons SET
            code = ?, description = ?, discount_type = ?, discount_value = ?,
            min_purchase_amount = ?, max_discount_amount = ?, usage_limit = ?, is_active = ?
           WHERE id = ?""",
        (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, is_active, coupon_id)
    )

    log_audit("COUPON_UPDATED", "coupons", coupon_id, {"code": code})
    return jsonify({"message": "Coupon updated."})

@admin_coupons_bp.route("/coupons/<int:coupon_id>/toggle", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def toggle_coupon(coupon_id):
    coupon = query_one("SELECT id, is_active FROM coupons WHERE id = ?", (coupon_id,))
    if not coupon:
        return jsonify({"error": "Coupon not found."}), 404

    new_val = 0 if coupon["is_active"] else 1
    execute_write("UPDATE coupons SET is_active = ? WHERE id = ?", (new_val, coupon_id))
    return jsonify({"message": f"Coupon {'activated' if new_val else 'deactivated'}.", "is_active": bool(new_val)})
