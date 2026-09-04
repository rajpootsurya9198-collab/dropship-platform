from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth, log_audit

admin_suppliers_bp = Blueprint("admin_suppliers", __name__)

@admin_suppliers_bp.route("/suppliers", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_suppliers():
    if request.method == "GET":
        sql = """
            SELECT s.*,
                   COUNT(DISTINCT p.id) as product_count,
                   COUNT(DISTINCT oi.id) as order_lines_count
            FROM suppliers s
            LEFT JOIN products p ON p.supplier_id = s.id
            LEFT JOIN order_items oi ON oi.supplier_id = s.id
            GROUP BY s.id
            ORDER BY s.id ASC
        """
        suppliers = query_all(sql)
        return jsonify({"suppliers": suppliers})

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()
    contact_name = data.get("contact_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    country = data.get("country", "").strip()
    shipping_origin = data.get("shipping_origin", "").strip()
    fulfillment_sla_days = int(data.get("fulfillment_sla_days", 2))
    return_policy = data.get("return_policy", "30-day standard replacement guarantee").strip()

    if not name or not code or not email or not shipping_origin:
        return jsonify({"error": "Name, supplier code, email, and shipping origin are required."}), 400

    existing = query_one("SELECT id FROM suppliers WHERE code = ?", (code,))
    if existing:
        return jsonify({"error": f"Supplier with code {code} already exists."}), 400

    sup_id = execute_write(
        """INSERT INTO suppliers (name, code, contact_name, email, phone, country, shipping_origin, fulfillment_sla_days, return_policy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, code, contact_name, email, phone, country, shipping_origin, fulfillment_sla_days, return_policy)
    )

    log_audit("SUPPLIER_CREATED", "suppliers", sup_id, {"code": code, "name": name})
    return jsonify({"message": "Supplier added.", "supplier_id": sup_id}), 201

@admin_suppliers_bp.route("/suppliers/<int:sup_id>", methods=["GET", "PUT", "DELETE"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_supplier_by_id(sup_id):
    sup = query_one("SELECT * FROM suppliers WHERE id = ?", (sup_id,))
    if not sup:
        return jsonify({"error": "Supplier not found."}), 404

    if request.method == "GET":
        products = query_all("SELECT id, title, sku, cost_price, retail_price, stock_quantity FROM products WHERE supplier_id = ?", (sup_id,))
        sup["products"] = products
        return jsonify({"supplier": sup})

    elif request.method == "DELETE":
        # Check if products exist
        has_prods = query_one("SELECT COUNT(id) as cnt FROM products WHERE supplier_id = ?", (sup_id,))["cnt"]
        if has_prods > 0:
            return jsonify({"error": f"Cannot delete supplier with {has_prods} active products. Reassign or delete products first."}), 400
        execute_write("DELETE FROM suppliers WHERE id = ?", (sup_id,))
        log_audit("SUPPLIER_DELETED", "suppliers", sup_id)
        return jsonify({"message": "Supplier deleted."})

    elif request.method == "PUT":
        data = request.get_json() or {}
        name = data.get("name", sup["name"]).strip()
        contact_name = data.get("contact_name", sup["contact_name"]).strip()
        email = data.get("email", sup["email"]).strip().lower()
        phone = data.get("phone", sup["phone"]).strip()
        country = data.get("country", sup["country"]).strip()
        shipping_origin = data.get("shipping_origin", sup["shipping_origin"]).strip()
        fulfillment_sla_days = int(data.get("fulfillment_sla_days", sup["fulfillment_sla_days"]))
        return_policy = data.get("return_policy", sup["return_policy"]).strip()
        is_verified = 1 if data.get("is_verified", sup["is_verified"]) else 0

        execute_write(
            """UPDATE suppliers SET
                name = ?, contact_name = ?, email = ?, phone = ?, country = ?,
                shipping_origin = ?, fulfillment_sla_days = ?, return_policy = ?, is_verified = ?
               WHERE id = ?""",
            (name, contact_name, email, phone, country, shipping_origin, fulfillment_sla_days, return_policy, is_verified, sup_id)
        )

        log_audit("SUPPLIER_UPDATED", "suppliers", sup_id)
        return jsonify({"message": "Supplier updated."})
