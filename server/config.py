import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(PROJECT_ROOT, "dropship.db"))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-dropship-platform-key-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

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

