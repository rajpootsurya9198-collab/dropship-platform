import pytest
import json
from server.app import create_app
from server.db import query_one, query_all
from server.seed import seed_database
from server.security import create_access_token, has_permission
from server.config import SEED_ADMIN_EMAIL, SEED_STAFF_EMAIL

@pytest.fixture(scope="module")
def app():
    seed_database()
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture(scope="module")
def client(app):
    return app.test_client()

@pytest.fixture
def staff_token():
    user = query_one("SELECT * FROM users WHERE email = ?", (SEED_STAFF_EMAIL,))
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

@pytest.fixture
def admin_token():
    user = query_one("SELECT * FROM users WHERE email = ?", (SEED_ADMIN_EMAIL,))
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

@pytest.fixture
def customer_token():
    user = query_one("SELECT * FROM users WHERE role = 'customer'")
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

# 1. Test Staff Granular Permissions
def test_staff_permission_helper():
    staff_user = {
        "role": "staff",
        "is_active": 1,
        "permissions": ["ORDER_READ", "ORDER_WRITE", "PRODUCT_READ"]
    }
    assert has_permission(staff_user, "ORDER_READ") is True
    assert has_permission(staff_user, "ORDER_WRITE") is True
    assert has_permission(staff_user, "PRODUCT_DELETE") is False
    assert has_permission(staff_user, "SETTINGS_WRITE") is False

def test_admin_has_all_permissions():
    admin_user = {"role": "admin", "is_active": 1}
    assert has_permission(admin_user, "SETTINGS_WRITE") is True
    assert has_permission(admin_user, "ADMIN_MANAGE") is True
    assert has_permission(admin_user, "PRODUCT_DELETE") is True

def test_customer_has_no_admin_permissions():
    cust_user = {"role": "customer", "is_active": 1}
    assert has_permission(cust_user, "ORDER_READ") is False
    assert has_permission(cust_user, "SETTINGS_WRITE") is False

# 2. Test Staff API Access
def test_staff_can_view_orders(client, staff_token):
    res = client.get("/api/admin/orders", headers={"Authorization": f"Bearer {staff_token}"})
    assert res.status_code == 200
    assert "orders" in res.get_json()

def test_staff_cannot_access_settings(client, staff_token):
    res = client.get("/api/admin/settings", headers={"Authorization": f"Bearer {staff_token}"})
    # Staff role is not admin and doesn't have SETTINGS_WRITE
    assert res.status_code in [403, 401]

# 3. Test Concurrency Stock Guard During Checkout
def test_insufficient_stock_error(client, customer_token):
    prod = query_one("SELECT id, stock_quantity FROM products LIMIT 1")
    excessive_qty = prod["stock_quantity"] + 1000

    res = client.post("/api/checkout/place-order", json={
        "items": [{"product_id": prod["id"], "quantity": excessive_qty}],
        "shipping_address": {
            "full_name": "Test Excess",
            "street_address": "123 St",
            "city": "City",
            "postal_code": "00000"
        },
        "customer_info": {"name": "Test", "email": "customer@example.com"}
    }, headers={"Authorization": f"Bearer {customer_token}"})

    assert res.status_code == 400
    data = res.get_json()
    assert "Insufficient stock" in data["error"] or "out of stock" in data["error"]
