from flask import Blueprint, request, jsonify, g
from ..db import query_one, execute_write, query_all
from ..security import hash_password, verify_password, create_access_token, require_auth, optional_auth, log_audit

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "customer").strip().lower()
    phone = data.get("phone", "").strip()

    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if not full_name:
        return jsonify({"error": "Full name is required."}), 400
    if role not in ["customer", "merchant"]:
        role = "customer"

    existing = query_one("SELECT id FROM users WHERE email = ?", (email,))
    if existing:
        return jsonify({"error": "An account with this email already exists."}), 400

    pwd_hash = hash_password(password)
    user_id = execute_write(
        """INSERT INTO users (email, password_hash, full_name, role, phone, avatar_url)
           VALUES (?, ?, ?, ?, ?, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')""",
        (email, pwd_hash, full_name, role, phone)
    )

    token = create_access_token(user_id, email, role, full_name)
    user = query_one("SELECT id, email, full_name, role, phone, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    
    log_audit("USER_REGISTER", "users", user_id, {"email": email, "role": role})

    return jsonify({
        "message": "Account created successfully.",
        "token": token,
        "user": user
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = query_one("SELECT id, email, password_hash, full_name, role, phone, avatar_url, is_active FROM users WHERE email = ?", (email,))
    if not user or not verify_password(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user["is_active"]:
        return jsonify({"error": "Account is disabled. Contact support."}), 403

    token = create_access_token(user["id"], user["email"], user["role"], user["full_name"])
    
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user["phone"],
        "avatar_url": user["avatar_url"]
    }

    log_audit("USER_LOGIN", "users", user["id"], {"email": email})

    return jsonify({
        "message": "Logged in successfully.",
        "token": token,
        "user": user_data
    })

@auth_bp.route("/me", methods=["GET"])
@require_auth()
def me():
    return jsonify({"user": g.current_user})

@auth_bp.route("/profile", methods=["PUT"])
@require_auth()
def update_profile():
    data = request.get_json() or {}
    user_id = g.current_user["id"]
    full_name = data.get("full_name", g.current_user["full_name"]).strip()
    phone = data.get("phone", g.current_user.get("phone", "")).strip()
    avatar_url = data.get("avatar_url", g.current_user.get("avatar_url", ""))
    
    execute_write(
        "UPDATE users SET full_name = ?, phone = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (full_name, phone, avatar_url, user_id)
    )
    
    updated_user = query_one("SELECT id, email, full_name, role, phone, avatar_url FROM users WHERE id = ?", (user_id,))
    log_audit("USER_UPDATE_PROFILE", "users", user_id)
    return jsonify({"message": "Profile updated.", "user": updated_user})

@auth_bp.route("/switch-demo-role", methods=["POST"])
def switch_demo_role():
    """Allows 1-click role switching for effortless demonstration & testing"""
    data = request.get_json() or {}
    target_role = data.get("role", "customer").lower()
    
    role_email_map = {
        "admin": "admin@dropship.io",
        "merchant": "merchant@novaretail.com",
        "supplier": "supplier@apextech.com",
        "customer": "customer@example.com"
    }
    
    email = role_email_map.get(target_role, "customer@example.com")
    user = query_one("SELECT id, email, full_name, role, phone, avatar_url FROM users WHERE email = ?", (email,))
    
    if not user:
        return jsonify({"error": f"Demo user for {target_role} not found."}), 404
        
    token = create_access_token(user["id"], user["email"], user["role"], user["full_name"])
    
    return jsonify({
        "message": f"Switched to {target_role.upper()} demo role.",
        "token": token,
        "user": user
    })
