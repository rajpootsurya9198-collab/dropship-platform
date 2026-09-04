import os
from flask import Flask, jsonify, send_from_directory, request
from .config import BASE_DIR, PROJECT_ROOT, DATABASE_PATH
from .db import init_db
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

def create_app():
    static_folder = os.path.join(PROJECT_ROOT, "static")
    app = Flask(__name__, static_folder=static_folder, static_url_path="/static")

    # Auto-initialize DB if not exists
    if not os.path.exists(DATABASE_PATH):
        print("Database not found. Seeding initial database...")
        seed_database()

    # CORS Headers Middleware
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        return response

    # Handle Preflight OPTIONS
    @app.route("/api/<path:dummy>", methods=["OPTIONS"])
    def handle_options(dummy):
        return jsonify({"status": "ok"}), 200

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

    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "NovaDrop Enterprise Dropshipping Platform",
            "database": "SQLite (WAL Mode)"
        })

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

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Resource not found"}), 404
        return send_from_directory(static_folder, "index.html")

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error occurred."}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
