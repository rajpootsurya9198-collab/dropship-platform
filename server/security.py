import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import request, jsonify, g
from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from .db import query_one, execute_write
import json

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 100_000
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    return f"pbkdf2:sha256:{iterations}${salt}${key.hex()}"

def verify_password(stored_password_hash: str, provided_password: str) -> bool:
    try:
        parts = stored_password_hash.split('$')
        if len(parts) != 3:
            return False
        algo_iter, salt, stored_key = parts
        _, _, iterations = algo_iter.split(':')
        iterations = int(iterations)
        
        derived_key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return secrets.compare_digest(derived_key.hex(), stored_key)
    except Exception:
        return False

def create_access_token(user_id: int, email: str, role: str, full_name: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "name": full_name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

ALL_PERMISSIONS = [
    "PRODUCT_READ", "PRODUCT_WRITE", "PRODUCT_DELETE",
    "ORDER_READ", "ORDER_WRITE",
    "CUSTOMER_READ", "CUSTOMER_WRITE",
    "COUPON_WRITE",
    "ANALYTICS_READ",
    "SUPPLIER_WRITE",
    "SETTINGS_WRITE",
    "ADMIN_MANAGE"
]

def get_current_user_from_request():
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")
    
    if not token:
        return None
    
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = int(payload["sub"])
    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user or not user["is_active"]:
        return None
    
    try:
        user["permissions"] = json.loads(user["permissions_json"]) if user.get("permissions_json") else []
    except Exception:
        user["permissions"] = []

    return user

def has_permission(user: dict, permission: str) -> bool:
    if not user or not user.get("is_active"):
        return False
    
    role = user.get("role", "customer")
    if role == "admin":
        return True
    elif role == "merchant":
        return permission != "ADMIN_MANAGE"
    elif role == "supplier":
        return permission in ["PRODUCT_READ", "PRODUCT_WRITE", "ORDER_READ", "ORDER_WRITE"]
    elif role == "staff":
        user_perms = user.get("permissions", [])
        return permission in user_perms
    return False

def require_permission(permission: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user_from_request()
            if not user:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            
            if not has_permission(user, permission):
                return jsonify({"error": f"Forbidden. Missing required permission: {permission}"}), 403
            
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_auth(allowed_roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user_from_request()
            if not user:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            
            if allowed_roles:
                if isinstance(allowed_roles, str):
                    roles = [allowed_roles]
                else:
                    roles = allowed_roles
                if user["role"] not in roles:
                    return jsonify({"error": f"Forbidden. Requires one of roles: {', '.join(roles)}"}), 403
            
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def optional_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.current_user = get_current_user_from_request()
        return fn(*args, **kwargs)
    return wrapper

def log_audit(action: str, entity_type: str, entity_id=None, details=None):
    user = getattr(g, 'current_user', None) or get_current_user_from_request()
    user_id = user["id"] if user else None
    user_email = user["email"] if user else "anonymous"
    ip = request.remote_addr or "127.0.0.1"
    details_str = json.dumps(details) if details else None
    
    try:
        execute_write(
            """INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details_json, ip_address)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_email, action, entity_type, str(entity_id) if entity_id else None, details_str, ip)
        )
    except Exception as e:
        print(f"Failed to write audit log: {e}")
