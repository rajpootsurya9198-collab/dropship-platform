import os
import pytest
from server.app import create_app, is_origin_allowed
from server.db import check_tables_exist, check_database_health, get_db

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_api_health_endpoint(client):
    """Verify /api/health returns detailed health, service name, and database status."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "NovaDrop"
    assert data["database"] == "connected"
    assert data["version"] == "2.1.0-production"
    assert "timestamp" in data

def test_production_jwt_secret_enforcement(monkeypatch):
    """Verify production startup fails if JWT_SECRET is missing or insecure default."""
    import importlib
    import server.config as config

    # Missing / default secret in production should raise RuntimeError
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(config)
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)

    # Insecure short secret in production should raise RuntimeError
    monkeypatch.setenv("JWT_SECRET", "short")
    with pytest.raises(RuntimeError) as exc_info:
        importlib.reload(config)
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)

    # Valid secret in production should succeed
    monkeypatch.setenv("JWT_SECRET", "super-strong-production-secret-key-32chars!!")
    importlib.reload(config)
    assert config.JWT_SECRET == "super-strong-production-secret-key-32chars!!"

    # Reset back to development for remaining tests
    monkeypatch.setenv("ENV", "development")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    importlib.reload(config)

def test_cors_preflight_and_headers(client):
    """Verify CORS preflight OPTIONS and response headers for GitHub Pages origin."""
    gh_origin = "https://rajpootsurya9198-collab.github.io"
    
    # Preflight OPTIONS request
    opt_res = client.options("/api/auth/login", headers={"Origin": gh_origin})
    assert opt_res.status_code == 200
    assert opt_res.headers.get("Access-Control-Allow-Origin") == gh_origin
    assert "Authorization" in opt_res.headers.get("Access-Control-Allow-Headers", "")
    assert "POST" in opt_res.headers.get("Access-Control-Allow-Methods", "")

    # Actual request with Origin header
    get_res = client.get("/api/health", headers={"Origin": gh_origin})
    assert get_res.status_code == 200
    assert get_res.headers.get("Access-Control-Allow-Origin") == gh_origin
    assert get_res.headers.get("Access-Control-Allow-Credentials") == "true"

def test_cors_unallowed_origin_in_production(monkeypatch):
    """Verify untrusted origins are blocked when strict production CORS is configured."""
    import server.config as config
    from server.app import is_origin_allowed

    # Simulate production mode with explicit allowed origins
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(config, "ALLOWED_ORIGINS", ["https://rajpootsurya9198-collab.github.io"])

    assert is_origin_allowed("https://rajpootsurya9198-collab.github.io") is True
    assert is_origin_allowed("https://rajpootsurya9198-collab.github.io/") is True
    assert is_origin_allowed("https://malicious-phishing-site.com") is False
    assert is_origin_allowed("http://localhost:5000") is False

def test_cross_origin_auth_flow_for_all_roles(client):
    """Verify login and JWT token auth work across origins for all 4 core roles."""
    roles_credentials = [
        ("admin@dropship.io", "Admin123!", "admin"),
        ("merchant@novaretail.com", "Merchant123!", "merchant"),
        ("supplier@apextech.com", "Supplier123!", "supplier"),
        ("customer@example.com", "Customer123!", "customer")
    ]
    gh_origin = "https://rajpootsurya9198-collab.github.io"

    for email, password, expected_role in roles_credentials:
        # 1. Login
        login_res = client.post("/api/auth/login", json={
            "email": email,
            "password": password
        }, headers={"Origin": gh_origin})
        
        assert login_res.status_code == 200, f"Login failed for {email}: {login_res.get_data(as_text=True)}"
        assert login_res.headers.get("Access-Control-Allow-Origin") == gh_origin
        data = login_res.get_json()
        assert "token" in data
        assert data["user"]["role"] == expected_role
        token = data["token"]

        # 2. Authenticated request using Bearer token
        me_res = client.get("/api/auth/me", headers={
            "Origin": gh_origin,
            "Authorization": f"Bearer {token}"
        })
        assert me_res.status_code == 200
        me_data = me_res.get_json()
        assert me_data["user"]["email"] == email
        assert me_data["user"]["role"] == expected_role

def test_safe_database_tables_and_health():
    """Verify check_tables_exist and check_database_health report accurate status."""
    assert check_tables_exist() is True
    health = check_database_health()
    assert health["status"] == "connected"
    assert health["tables_count"] >= 14
    assert "users" in health["tables"]
    assert "webhook_subscriptions" in health["tables"]
    assert "webhook_deliveries" in health["tables"]

def test_postgresql_compatibility_translation(monkeypatch):
    """Verify PostgreSQL parameter translation and DDL schema conversion."""
    import server.db as db
    
    # Test translate_sql in postgres mode
    monkeypatch.setattr(db, "DB_ENGINE", "postgres")
    sql = "SELECT * FROM users WHERE email = ? AND role = ?"
    translated = db.translate_sql(sql)
    assert translated == "SELECT * FROM users WHERE email = %s AND role = %s"
    
    # Test DDL schema conversion
    sqlite_ddl = """
    PRAGMA foreign_keys = ON;
    CREATE TABLE test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """
    pg_ddl = db.convert_schema_to_postgres(sqlite_ddl)
    assert "PRAGMA" not in pg_ddl
    assert "SERIAL PRIMARY KEY" in pg_ddl
    assert "TIMESTAMP" in pg_ddl

def test_frontend_api_url_resolution_logic():
    """Verify frontend URL building logic handles trailing slashes, /api deduplication, and full paths."""
    def build_url(base_url, endpoint):
        base = (base_url or "").strip().rstrip("/")
        ep = (endpoint or "").strip()
        if not ep.startswith("/"):
            ep = "/" + ep
        if base.endswith("/api") and ep.startswith("/api/"):
            ep = ep[4:]
        elif not base.endswith("/api") and not ep.startswith("/api/"):
            if base:
                base = base + "/api"
            else:
                base = "/api"
        import re
        combined = f"{base}{ep}"
        return re.sub(r'([^:])//+', r'\1/', combined)

    # 1. Local relative default
    assert build_url("/api", "/auth/login") == "/api/auth/login"
    assert build_url("", "/auth/login") == "/api/auth/login"

    # 2. Production URL ending with /api
    assert build_url("https://novadrop-api.onrender.com/api", "/auth/login") == "https://novadrop-api.onrender.com/api/auth/login"
    assert build_url("https://novadrop-api.onrender.com/api/", "/api/auth/login") == "https://novadrop-api.onrender.com/api/auth/login"

    # 3. Production domain without /api
    assert build_url("https://novadrop-api.onrender.com", "/store/products") == "https://novadrop-api.onrender.com/api/store/products"
    assert build_url("https://your-backend.example.com", "health") == "https://your-backend.example.com/api/health"
