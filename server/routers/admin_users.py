from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth, hash_password, log_audit

admin_users_bp = Blueprint("admin_users", __name__)

@admin_users_bp.route("/users", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin"])
def handle_users():
    if request.method == "GET":
        role_filter = request.args.get("role", "").strip()
        where_sql = "WHERE role = ?" if role_filter else ""
        params = (role_filter,) if role_filter else ()

        sql = f"""
            SELECT u.id, u.email, u.full_name, u.role, u.phone, u.avatar_url, u.is_active, u.created_at,
                   (SELECT COUNT(o.id) FROM orders o WHERE o.user_id = u.id OR o.customer_email = u.email) as total_orders,
                   (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE (o.user_id = u.id OR o.customer_email = u.email) AND o.payment_status = 'paid') as lifetime_spend
            FROM users u
            {where_sql}
            ORDER BY u.created_at DESC
        """
        users = query_all(sql, params)
        return jsonify({"users": users})

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "customer").strip().lower()
    phone = data.get("phone", "").strip()

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and full name are required."}), 400

    existing = query_one("SELECT id FROM users WHERE email = ?", (email,))
    if existing:
        return jsonify({"error": "User with this email already exists."}), 400

    pwd_hash = hash_password(password)
    user_id = execute_write(
        """INSERT INTO users (email, password_hash, full_name, role, phone, avatar_url)
           VALUES (?, ?, ?, ?, ?, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')""",
        (email, pwd_hash, full_name, role, phone)
    )

    log_audit("USER_CREATED_BY_ADMIN", "users", user_id, {"email": email, "role": role})
    return jsonify({"message": f"User {full_name} created with role {role}.", "user_id": user_id}), 201

@admin_users_bp.route("/users/<int:user_id>", methods=["PUT", "DELETE"])
@require_auth(allowed_roles=["admin"])
def handle_user_by_id(user_id):
    target_user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not target_user:
        return jsonify({"error": "User not found."}), 404

    if request.method == "DELETE":
        if target_user["id"] == g.current_user["id"]:
            return jsonify({"error": "Cannot delete your own active admin account."}), 400
        execute_write("DELETE FROM users WHERE id = ?", (user_id,))
        log_audit("USER_DELETED", "users", user_id, {"email": target_user["email"]})
        return jsonify({"message": "User deleted."})

    data = request.get_json() or {}
    full_name = data.get("full_name", target_user["full_name"]).strip()
    role = data.get("role", target_user["role"]).strip().lower()
    phone = data.get("phone", target_user["phone"]).strip()
    is_active = 1 if data.get("is_active", target_user["is_active"]) else 0

    if role not in ["admin", "merchant", "supplier", "customer"]:
        return jsonify({"error": "Invalid role."}), 400

    execute_write(
        "UPDATE users SET full_name = ?, role = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (full_name, role, phone, is_active, user_id)
    )

    log_audit("USER_UPDATED_BY_ADMIN", "users", user_id, {"role": role, "is_active": is_active})
    return jsonify({"message": "User updated."})

@admin_users_bp.route("/audit-logs", methods=["GET"])
@require_auth(allowed_roles=["admin"])
def get_audit_logs():
    limit = min(100, max(10, request.args.get("limit", 50, type=int)))
    logs = query_all(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    return jsonify({"audit_logs": logs})
