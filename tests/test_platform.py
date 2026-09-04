import pytest
import json
from server.app import create_app
from server.db import query_one, query_all
from server.seed import seed_database
from server.security import create_access_token

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
def admin_token():
    user = query_one("SELECT * FROM users WHERE role = 'admin'")
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

@pytest.fixture
def customer_token():
    user = query_one("SELECT * FROM users WHERE role = 'customer'")
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

@pytest.fixture
def supplier_token():
    user = query_one("SELECT * FROM users WHERE role = 'supplier'")
    return create_access_token(user["id"], user["email"], user["role"], user["full_name"])

# 1. Auth & RBAC
def test_auth_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "customer@example.com",
        "password": "Customer123!"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["user"]["email"] == "customer@example.com"
    assert data["user"]["role"] == "customer"

def test_auth_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "customer@example.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_rbac_admin_endpoint_forbidden_for_customer(client, customer_token):
    res = client.get("/api/admin/analytics/overview", headers={
        "Authorization": f"Bearer {customer_token}"
    })
    assert res.status_code in [403, 401]

def test_rbac_admin_endpoint_allowed_for_admin(client, admin_token):
    res = client.get("/api/admin/analytics/overview", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "gmv" in data
    assert "net_profit" in data

def test_switch_demo_role(client):
    res = client.post("/api/auth/switch-demo-role", json={"role": "admin"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "admin"
    assert "token" in data

# 2. Storefront Catalog
def test_get_store_products(client):
    res = client.get("/api/store/products")
    assert res.status_code == 200
    data = res.get_json()
    assert "products" in data
    assert len(data["products"]) > 0

def test_get_store_categories(client):
    res = client.get("/api/store/categories")
    assert res.status_code == 200
    data = res.get_json()
    assert "categories" in data
    assert len(data["categories"]) >= 5

def test_get_product_detail_with_variants(client):
    res = client.get("/api/store/products/aurasound-pro-anc-headphones")
    assert res.status_code == 200
    data = res.get_json()
    assert "product" in data
    p = data["product"]
    assert p["slug"] == "aurasound-pro-anc-headphones"
    assert "variants" in p
    assert len(p["variants"]) >= 2
    assert "reviews" in p

# 3. Checkout & Coupon Validation
def test_coupon_validation(client):
    res = client.post("/api/checkout/validate-coupon", json={
        "code": "WELCOME10",
        "subtotal": 100.00
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["valid"] is True
    assert data["discount_amount"] == 10.00

def test_shipping_calculation(client):
    res = client.post("/api/checkout/calculate-shipping", json={
        "subtotal": 60.00,
        "shipping_method": "standard"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["shipping_fee"] == 0.0  # Free shipping over $50
    assert data["qualifies_for_free_shipping"] is True

# 4. Place Order & Multi-Supplier Routing
def test_place_order_multi_supplier(client, customer_token):
    prods = query_all("SELECT id, supplier_id, stock_quantity FROM products LIMIT 2")
    prod1, prod2 = prods[0], prods[1]
    initial_stock1 = prod1["stock_quantity"]

    payload = {
        "items": [
            {"product_id": prod1["id"], "quantity": 1},
            {"product_id": prod2["id"], "quantity": 1}
        ],
        "shipping_address": {
            "full_name": "Test Buyer",
            "street_address": "123 Commerce St",
            "city": "Austin",
            "state": "TX",
            "postal_code": "78701",
            "country": "United States"
        },
        "customer_info": {
            "name": "Test Buyer",
            "email": "customer@example.com"
        },
        "shipping_method": "standard",
        "coupon_code": "WELCOME10"
    }

    res = client.post("/api/checkout/place-order", json=payload, headers={
        "Authorization": f"Bearer {customer_token}"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "order_number" in data
    assert data["order_number"].startswith("ORD-")
    assert "fulfillments" in data
    assert len(data["fulfillments"]) >= 1

    updated_prod1 = query_one("SELECT stock_quantity FROM products WHERE id = ?", (prod1["id"],))
    assert updated_prod1["stock_quantity"] == initial_stock1 - 1

# 5. Tracking Lookup
def test_tracking_search(client):
    res = client.get("/api/tracking/ORD-88201")
    assert res.status_code == 200
    data = res.get_json()
    assert data["found"] is True
    assert data["order_number"] == "ORD-88201"

# 6. Order Cancellation & Stock Restoration
def test_cancel_order_and_restore_stock(client, customer_token):
    prod = query_one("SELECT id, stock_quantity FROM products LIMIT 1")
    stock_before = prod["stock_quantity"]

    res_order = client.post("/api/checkout/place-order", json={
        "items": [{"product_id": prod["id"], "quantity": 2}],
        "shipping_address": {
            "full_name": "Cancel Test",
            "street_address": "456 Test Ave",
            "city": "Austin",
            "state": "TX",
            "postal_code": "78701"
        },
        "customer_info": {"name": "Cancel Test", "email": "customer@example.com"}
    }, headers={"Authorization": f"Bearer {customer_token}"})

    order_num = res_order.get_json()["order_number"]

    res_cancel = client.post(f"/api/orders/{order_num}/cancel", json={
        "reason": "Test cancellation"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert res_cancel.status_code == 200

    stock_restored = query_one("SELECT stock_quantity FROM products WHERE id = ?", (prod["id"],))["stock_quantity"]
    assert stock_restored == stock_before

# 7. Customer Address CRUD
def test_customer_address_crud(client, customer_token):
    res_add = client.post("/api/customer/addresses", json={
        "title": "Vacation Home",
        "full_name": "Sophia Martinez",
        "street_address": "999 Ocean Drive",
        "city": "Miami",
        "state": "FL",
        "postal_code": "33139"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert res_add.status_code == 201
    addr_id = res_add.get_json()["address"]["id"]

    res_get = client.get("/api/customer/addresses", headers={"Authorization": f"Bearer {customer_token}"})
    assert res_get.status_code == 200
    assert any(a["id"] == addr_id for a in res_get.get_json()["addresses"])

    res_del = client.delete(f"/api/customer/addresses/{addr_id}", headers={"Authorization": f"Bearer {customer_token}"})
    assert res_del.status_code == 200

# 8. Customer Wishlist Toggle
def test_wishlist_toggle(client, customer_token):
    prod = query_one("SELECT id FROM products LIMIT 1")
    res_toggle = client.post("/api/store/wishlist/toggle", json={"product_id": prod["id"]}, headers={"Authorization": f"Bearer {customer_token}"})
    assert res_toggle.status_code == 200

    res_list = client.get("/api/store/wishlist", headers={"Authorization": f"Bearer {customer_token}"})
    assert res_list.status_code == 200

# 9. Review Submission & Stats Recalculation
def test_submit_review(client, customer_token):
    prod = query_one("SELECT id FROM products LIMIT 1")
    res = client.post(f"/api/store/reviews/{prod['id']}", json={
        "rating": 5,
        "title": "Outstanding durability",
        "comment": "Exceeded all my expectations. High quality build."
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 201

# 10. Admin Supplier Fulfillment Dispatch
def test_admin_order_dispatch(client, admin_token):
    order = query_one("SELECT id, order_number FROM orders WHERE order_status = 'processing' LIMIT 1")
    if not order:
        order = query_one("SELECT id, order_number FROM orders LIMIT 1")

    res = client.post(f"/api/admin/orders/{order['id']}/fulfill", json={
        "carrier": "FedEx",
        "tracking_number": "FDX-99887766US",
        "carrier_service": "Priority Air"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["order_status"] == "shipped"
    assert data["tracking_number"] == "FDX-99887766US"

# 11. Admin Dispute / Refund Resolution
def test_admin_refund_resolution(client, admin_token):
    dispute = query_one("SELECT id, requested_amount FROM refund_disputes LIMIT 1")
    res = client.put(f"/api/admin/refunds/{dispute['id']}/status", json={
        "status": "refunded",
        "refund_amount": dispute["requested_amount"],
        "admin_notes": "Test dispute approved"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "refunded"

# 12. Admin Bulk Pricing Markup
def test_admin_bulk_markup_application(client, admin_token):
    res = client.post("/api/admin/products/bulk-markup", json={
        "markup_type": "multiplier",
        "markup_value": 2.5,
        "rounding_format": "99"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "updated_count" in data
    assert data["updated_count"] > 0
