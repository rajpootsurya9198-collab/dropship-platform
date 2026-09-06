import os
from flask import Flask, jsonify, send_from_directory, request
from datetime import datetime, timezone
from .config import BASE_DIR, PROJECT_ROOT, DATABASE_PATH, IS_PRODUCTION, ALLOWED_ORIGINS, DEV_CORS_ORIGINS
from .db import init_db, check_tables_exist, check_database_health
from .seed import seed_database

# Import Blueprints
from .routers.auth import auth_bp
from .routers.storefront import storefront_bp
from .routers.checkout import checkout_bp
from .routers.orders import orders_bp
from .routers.tracking import tracking_bp
from .routers.customer import customer_bp
from .routers.admin_products import admin_products_bp
from .routers.admin_orders import admin_orders_bp
from .routers.admin_suppliers import admin_suppliers_bp
from .routers.admin_coupons import admin_coupons_bp
from .routers.admin_reviews import admin_reviews_bp
from .routers.admin_refunds import admin_refunds_bp
from .routers.admin_analytics import admin_analytics_bp
from .routers.admin_settings import admin_settings_bp
from .routers.admin_users import admin_users_bp
from .routers.webhook_routes import webhook_bp
from .routers.seo_routes import seo_bp

ALLOWED_CORS_HEADERS = (
    "Content-Type, Authorization, X-Requested-With, Idempotency-Key, "
    "X-Idempotency-Key, Stripe-Signature, X-NovaDrop-Signature, "
    "X-NovaDrop-Event, X-NovaDrop-Delivery, X-NovaDrop-Timestamp"
)

def is_origin_allowed(origin: str) -> bool:
    from . import config
    if not origin:
        return True
    origin_clean = origin.strip().rstrip("/")
    if not config.IS_PRODUCTION:
        if any(origin_clean.startswith(prefix) for prefix in ["http://localhost", "http://127.0.0.1", "http://0.0.0.0"]):
            return True
        if origin_clean in config.DEV_CORS_ORIGINS or origin_clean.endswith(".github.io"):
            return True
    # Production check
    if config.ALLOWED_ORIGINS:
        return origin_clean in config.ALLOWED_ORIGINS
    # Default fallback when CORS_ORIGINS is not explicitly configured
    return origin_clean == "https://rajpootsurya9198-collab.github.io"

def create_app():
    static_folder = os.path.join(PROJECT_ROOT, "static")
    app = Flask(__name__, static_folder=static_folder, static_url_path="/static")

    # Safe database initialization: check tables without wiping existing data
    if not check_tables_exist():
        print("Database tables not found. Initializing schema...")
        seed_env = os.environ.get("SEED_DEMO_DATA", "").lower()
        if not IS_PRODUCTION or seed_env in ["true", "1", "yes"]:
            print("Seeding initial demo data...")
            seed_database()

    # CORS Headers Middleware
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = ALLOWED_CORS_HEADERS
            response.headers["Access-Control-Max-Age"] = "86400"
        elif not origin and not IS_PRODUCTION:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = ALLOWED_CORS_HEADERS
        return response

    # Handle Preflight OPTIONS
    @app.route("/api/<path:dummy>", methods=["OPTIONS"])
    def handle_options(dummy):
        origin = request.headers.get("Origin")
        resp = jsonify({"status": "ok"})
        if origin and is_origin_allowed(origin):
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            resp.headers["Access-Control-Allow-Headers"] = ALLOWED_CORS_HEADERS
            resp.headers["Access-Control-Max-Age"] = "86400"
        elif not IS_PRODUCTION:
            resp.headers["Access-Control-Allow-Origin"] = "*"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            resp.headers["Access-Control-Allow-Headers"] = ALLOWED_CORS_HEADERS
        return resp, 200

    # Register Blueprints with prefix
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(storefront_bp, url_prefix="/api/store")
    app.register_blueprint(checkout_bp, url_prefix="/api/checkout")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(tracking_bp, url_prefix="/api/tracking")
    app.register_blueprint(customer_bp, url_prefix="/api/customer")
    app.register_blueprint(admin_products_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_orders_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_suppliers_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_coupons_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_reviews_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_refunds_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_analytics_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_settings_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_users_bp, url_prefix="/api/admin")
    app.register_blueprint(webhook_bp, url_prefix="/api/webhooks")
    app.register_blueprint(seo_bp)

    # Production-ready health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health():
        from . import config
        db_health = check_database_health()
        is_healthy = (db_health.get("status") == "connected")
        
        data = {
            "status": "healthy" if is_healthy else "degraded",
            "service": "NovaDrop",
            "database": "connected" if is_healthy else "disconnected",
            "version": "2.1.0-production",
            "environment": "production" if config.IS_PRODUCTION else "development",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return jsonify(data), (200 if is_healthy else 503)

    # Serve Single Page Application Frontend
    @app.route("/", methods=["GET"])
    @app.route("/<path:path>", methods=["GET"])
    def serve_frontend(path=""):
        if path.startswith("api/"):
            return jsonify({"error": "API route not found"}), 404
        
        file_path = os.path.join(static_folder, path)
        if path and os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(static_folder, path)
        
        return send_from_directory(static_folder, "index.html")

    # Global JSON API Error Handlers (never return HTML for API requests)
    @app.errorhandler(400)
    def bad_request(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Bad request.")}), 400
        return str(e), 400

    @app.errorhandler(401)
    def unauthorized(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Authentication required.")}), 401
        return str(e), 401

    @app.errorhandler(403)
    def forbidden(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Access denied. Insufficient permissions.")}), 403
        return str(e), 403

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Resource not found.")}), 404
        return send_from_directory(static_folder, "index.html")

    @app.errorhandler(409)
    def conflict(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Conflict with current resource state.")}), 409
        return str(e), 409

    @app.errorhandler(422)
    def unprocessable_entity(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": getattr(e, "description", "Unprocessable entity.")}), 422
        return str(e), 422

    @app.errorhandler(500)
    def server_error(e):
        import logging
        logging.getLogger("novadrop").error(f"500 Internal error on {request.path}: {e}", exc_info=True)
        if request.path.startswith("/api/"):
            return jsonify({"error": "Internal server error occurred."}), 500
        return "Internal server error", 500

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            if request.path.startswith("/api/"):
                return jsonify({"error": e.description}), e.code
            return e
        import logging
        logging.getLogger("novadrop").error(f"Unhandled exception on {request.path}: {e}", exc_info=True)
        if request.path.startswith("/api/"):
            return jsonify({"error": "An internal server error occurred."}), 500
        return "An internal server error occurred", 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
