from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth

customer_bp = Blueprint("customer", __name__)

@customer_bp.route("/addresses", methods=["GET"])
@require_auth()
def get_addresses():
    user_id = g.current_user["id"]
    addresses = query_all(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
        (user_id,)
    )
    return jsonify({"addresses": addresses})

@customer_bp.route("/addresses", methods=["POST"])
@require_auth()
def create_address():
    user_id = g.current_user["id"]
    data = request.get_json() or {}

    title = data.get("title", "Home").strip()
    full_name = data.get("full_name", g.current_user["full_name"]).strip()
    street = data.get("street_address", "").strip()
    apt = data.get("apt_suite", "").strip()
    city = data.get("city", "").strip()
    state = data.get("state", "").strip()
    postal = data.get("postal_code", "").strip()
    country = data.get("country", "United States").strip()
    phone = data.get("phone", g.current_user.get("phone", "")).strip()
    is_default = 1 if data.get("is_default") else 0

    if not street or not city or not state or not postal:
        return jsonify({"error": "Street, city, state, and postal code are required."}), 400

    if is_default:
        execute_write("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user_id,))

    # If first address, make it default automatically
    existing_count = query_one("SELECT COUNT(id) as cnt FROM addresses WHERE user_id = ?", (user_id,))["cnt"]
    if existing_count == 0:
        is_default = 1

    addr_id = execute_write(
        """INSERT INTO addresses (user_id, title, full_name, street_address, apt_suite, city, state, postal_code, country, phone, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, title, full_name, street, apt, city, state, postal, country, phone, is_default)
    )

    new_addr = query_one("SELECT * FROM addresses WHERE id = ?", (addr_id,))
    return jsonify({"message": "Address saved.", "address": new_addr}), 201

@customer_bp.route("/addresses/<int:addr_id>", methods=["PUT"])
@require_auth()
def update_address(addr_id):
    user_id = g.current_user["id"]
    existing = query_one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", (addr_id, user_id))
    if not existing:
        return jsonify({"error": "Address not found."}), 404

    data = request.get_json() or {}
    title = data.get("title", existing["title"]).strip()
    full_name = data.get("full_name", existing["full_name"]).strip()
    street = data.get("street_address", existing["street_address"]).strip()
    apt = data.get("apt_suite", existing["apt_suite"]).strip()
    city = data.get("city", existing["city"]).strip()
    state = data.get("state", existing["state"]).strip()
    postal = data.get("postal_code", existing["postal_code"]).strip()
    country = data.get("country", existing["country"]).strip()
    phone = data.get("phone", existing["phone"]).strip()
    is_default = 1 if data.get("is_default") else existing["is_default"]

    if is_default and not existing["is_default"]:
        execute_write("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user_id,))

    execute_write(
        """UPDATE addresses SET title = ?, full_name = ?, street_address = ?, apt_suite = ?,
                  city = ?, state = ?, postal_code = ?, country = ?, phone = ?, is_default = ?
           WHERE id = ?""",
        (title, full_name, street, apt, city, state, postal, country, phone, is_default, addr_id)
    )

    updated = query_one("SELECT * FROM addresses WHERE id = ?", (addr_id,))
    return jsonify({"message": "Address updated.", "address": updated})

@customer_bp.route("/addresses/<int:addr_id>", methods=["DELETE"])
@require_auth()
def delete_address(addr_id):
    user_id = g.current_user["id"]
    existing = query_one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", (addr_id, user_id))
    if not existing:
        return jsonify({"error": "Address not found."}), 404

    execute_write("DELETE FROM addresses WHERE id = ?", (addr_id,))
    return jsonify({"message": "Address deleted."})

@customer_bp.route("/addresses/<int:addr_id>/set-default", methods=["POST"])
@require_auth()
def set_default_address(addr_id):
    user_id = g.current_user["id"]
    existing = query_one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", (addr_id, user_id))
    if not existing:
        return jsonify({"error": "Address not found."}), 404

    execute_write("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user_id,))
    execute_write("UPDATE addresses SET is_default = 1 WHERE id = ?", (addr_id,))
    return jsonify({"message": "Default address updated."})

@customer_bp.route("/reviews", methods=["GET"])
@require_auth()
def get_customer_reviews():
    user_id = g.current_user["id"]
    sql = """
        SELECT r.*, p.title as product_title, p.slug as product_slug, p.images_json
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    """
    reviews = query_all(sql, (user_id,))
    return jsonify({"reviews": reviews})
