import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Environment detection
ENV = os.environ.get("ENV") or os.environ.get("FLASK_ENV") or os.environ.get("NODE_ENV") or "development"
IS_PRODUCTION = ENV.lower() in ["production", "prod"]

# Database Configuration (SQLite for local dev, PostgreSQL for production)
DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(PROJECT_ROOT, "dropship.db"))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

if DATABASE_URL:
    # Normalize legacy postgres:// prefix (common on Heroku/Render) to standard postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    if DATABASE_URL.startswith("postgresql://"):
        DB_ENGINE = "postgres"
    else:
        DB_ENGINE = "sqlite"
else:
    DB_ENGINE = "sqlite"
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Security & Authentication Configuration
DEFAULT_DEV_JWT_SECRET = "super-secret-dropship-platform-key-production-2026"
RAW_JWT_SECRET = os.environ.get("JWT_SECRET")

if IS_PRODUCTION:
    if not RAW_JWT_SECRET or RAW_JWT_SECRET == DEFAULT_DEV_JWT_SECRET or len(RAW_JWT_SECRET.strip()) < 16:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: "
            "In production mode (ENV=production), you MUST provide a secure, strong "
            "JWT_SECRET environment variable (minimum 16 characters). "
            "Startup aborted to protect token signing integrity."
        )
    JWT_SECRET = RAW_JWT_SECRET.strip()
else:
    JWT_SECRET = RAW_JWT_SECRET.strip() if RAW_JWT_SECRET else DEFAULT_DEV_JWT_SECRET

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# CORS Configuration
CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", "")
DEV_CORS_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://rajpootsurya9198-collab.github.io"
]
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in CORS_ORIGINS_RAW.split(",") if o.strip()]

APP_NAME = "NovaDrop Enterprise Dropshipping Platform"
DEFAULT_CURRENCY = "USD"
DEFAULT_TAX_RATE = 0.08  # 8%
DEFAULT_FREE_SHIPPING_THRESHOLD = 50.0
DEFAULT_STANDARD_SHIPPING_FEE = 4.99
DEFAULT_EXPRESS_SHIPPING_FEE = 14.99

ROLES = ["admin", "merchant", "supplier", "staff", "customer"]

# Development Demo Accounts (Configurable via ENV — MUST CHANGE IN PRODUCTION)
SEED_ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@dropship.io")
SEED_ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "Admin123!")
SEED_STAFF_EMAIL = os.environ.get("SEED_STAFF_EMAIL", "staff@dropship.io")
SEED_STAFF_PASSWORD = os.environ.get("SEED_STAFF_PASSWORD", "Staff123!")


