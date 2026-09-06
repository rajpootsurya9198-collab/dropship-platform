import pytest
from server.app import create_app
from server.security import create_access_token

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@dropship.io",
        "password": "Admin123!"
    })
    assert res.status_code == 200
    return res.get_json()["token"]

@pytest.fixture
def customer_token(client):
    res = client.post("/api/auth/login", json={
        "email": "customer@example.com",
        "password": "Customer123!"
    })
    assert res.status_code == 200
    return res.get_json()["token"]

# ==========================================
# 1. AUTH API GROUP
# ==========================================
def test_auth_group(client, customer_token):
    # Register
    import uuid
    email = f"testbuyer_{uuid.uuid4().hex[:6]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Test Buyer"
    })
    assert reg_res.status_code == 201
    assert "token" in reg_res.get_json()

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    user_token = login_res.get_json()["token"]

    # Me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["email"] == email

    # Profile Update
    prof_res = client.put("/api/auth/profile", json={
        "full_name": "Updated Buyer Name",
        "phone": "+1 555 999 8888"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert prof_res.status_code == 200
    assert prof_res.get_json()["user"]["full_name"] == "Updated Buyer Name"

    # Demo Role Switch
    switch_res = client.post("/api/auth/switch-demo-role", json={"role": "supplier"})
    assert switch_res.status_code == 200
    assert switch_res.get_json()["user"]["role"] == "supplier"

# ==========================================
# 2. STOREFRONT API GROUP
# ==========================================
def test_storefront_group(client, customer_token):
    # Categories
    cats_res = client.get("/api/store/categories")
    assert cats_res.status_code == 200
    assert len(cats_res.get_json()["categories"]) > 0

    # Products
    prods_res = client.get("/api/store/products?limit=5")
    assert prods_res.status_code == 200
    products = prods_res.get_json()["products"]
    assert len(products) > 0
    prod_id = products[0]["id"]

    # Product Details
    det_res = client.get(f"/api/store/products/{prod_id}")
    assert det_res.status_code == 200
    assert det_res.get_json()["product"]["id"] == prod_id

    # Reviews
    rev_res = client.post(f"/api/store/reviews/{prod_id}", json={
        "rating": 5,
        "title": "Outstanding quality!",
        "comment": "Fast delivery and great build quality."
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert rev_res.status_code in [200, 201]

    # Wishlist toggle and get
    w_res = client.post("/api/store/wishlist/toggle", json={"product_id": prod_id}, headers={"Authorization": f"Bearer {customer_token}"})
    assert w_res.status_code == 200
    get_w = client.get("/api/store/wishlist", headers={"Authorization": f"Bearer {customer_token}"})
    assert get_w.status_code == 200

# ==========================================
# 3. CHECKOUT & ORDERS GROUP
# ==========================================
def test_checkout_and_orders_group(client, customer_token):
    # Validate Coupon
    coup_res = client.post("/api/checkout/validate-coupon", json={
        "code": "WELCOME10",
        "subtotal": 100.0
    })
    assert coup_res.status_code == 200
    assert coup_res.get_json()["discount_amount"] == 10.0

    # Calculate Shipping
    ship_res = client.post("/api/checkout/calculate-shipping", json={
        "subtotal": 45.0,
        "shipping_method": "standard"
    })
    assert ship_res.status_code == 200
    assert ship_res.get_json()["shipping_fee"] > 0

    # Place Order
    order_res = client.post("/api/checkout/place-order", json={
        "items": [{"product_id": 1, "variant_id": None, "quantity": 1}],
        "shipping_method": "standard",
        "shipping_address": {
            "full_name": "Sophia Martinez",
            "street_address": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "postal_code": "78701",
            "country": "US",
            "phone": "+1 555 123 4567"
        },
        "payment_method": "card",
        "card_token": "tok_mock_test_card"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert order_res.status_code == 201
    order_number = order_res.get_json()["order_number"]

    # My Orders
    my_orders_res = client.get("/api/orders/my-orders", headers={"Authorization": f"Bearer {customer_token}"})
    assert my_orders_res.status_code == 200
    assert any(o["order_number"] == order_number for o in my_orders_res.get_json()["orders"])

    # Order Detail
    detail_res = client.get(f"/api/orders/{order_number}", headers={"Authorization": f"Bearer {customer_token}"})
    assert detail_res.status_code == 200
    assert detail_res.get_json()["order"]["order_number"] == order_number

    # Order Cancellation
    cancel_res = client.post(f"/api/orders/{order_number}/cancel", json={
        "reason": "Changed my mind"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert cancel_res.status_code == 200

# ==========================================
# 4. CUSTOMER API GROUP
# ==========================================
def test_customer_addresses(client, customer_token):
    # List addresses
    addr_res = client.get("/api/customer/addresses", headers={"Authorization": f"Bearer {customer_token}"})
    assert addr_res.status_code == 200

    # Create address
    new_addr_res = client.post("/api/customer/addresses", json={
        "title": "Vacation Home",
        "full_name": "Sophia M",
        "street_address": "456 Beach Way",
        "city": "Miami",
        "state": "FL",
        "postal_code": "33101",
        "country": "US",
        "phone": "+1 555 333 4444",
        "is_default": False
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert new_addr_res.status_code == 201
    addr_id = new_addr_res.get_json()["address"]["id"]

    # Set default
    set_def = client.post(f"/api/customer/addresses/{addr_id}/set-default", headers={"Authorization": f"Bearer {customer_token}"})
    assert set_def.status_code == 200

# ==========================================
# 5. ADMIN API GROUP
# ==========================================
def test_admin_group(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Products
    assert client.get("/api/admin/products", headers=headers).status_code == 200
    # Categories
    assert client.get("/api/admin/categories", headers=headers).status_code == 200
    # Orders
    assert client.get("/api/admin/orders", headers=headers).status_code == 200
    # Suppliers
    assert client.get("/api/admin/suppliers", headers=headers).status_code == 200
    # Coupons
    assert client.get("/api/admin/coupons", headers=headers).status_code == 200
    # Reviews
    assert client.get("/api/admin/reviews", headers=headers).status_code == 200
    # Refunds
    assert client.get("/api/admin/refunds", headers=headers).status_code == 200
    # Analytics Overview
    assert client.get("/api/admin/analytics/overview", headers=headers).status_code == 200
    # Settings
    assert client.get("/api/admin/settings", headers=headers).status_code == 200
    # Users
    assert client.get("/api/admin/users", headers=headers).status_code == 200
    # Audit Logs
    assert client.get("/api/admin/audit-logs", headers=headers).status_code == 200

# ==========================================
# 6. TRACKING & WEBHOOKS GROUP
# ==========================================
def test_tracking_and_webhooks_group(client, admin_token):
    # Tracking
    track_res = client.get("/api/tracking/search?query=ORD-88201")
    assert track_res.status_code == 200
    assert track_res.get_json()["found"] is True
    assert track_res.get_json()["order_number"] == "ORD-88201"

    # Webhooks Events Catalog
    events_res = client.get("/api/webhooks/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert events_res.status_code == 200
    assert len(events_res.get_json()["events"]) > 0

    # Webhooks Subscriptions & Deliveries
    subs_res = client.get("/api/webhooks/subscriptions", headers={"Authorization": f"Bearer {admin_token}"})
    assert subs_res.status_code == 200

    deliv_res = client.get("/api/webhooks/deliveries", headers={"Authorization": f"Bearer {admin_token}"})
    assert deliv_res.status_code == 200

# ==========================================
# 7. ERROR HANDLING & JSON RESPONSES (NO HTML)
# ==========================================
def test_error_handlers_return_json(client):
    # 404 API route not found
    res_404 = client.get("/api/nonexistent-endpoint-xyz")
    assert res_404.status_code == 404
    assert res_404.is_json
    assert "error" in res_404.get_json()

    # 401 Unauthorized (expired / invalid token)
    res_401 = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_401.status_code == 401
    assert res_401.is_json
    assert "error" in res_401.get_json()

    # 403 Forbidden (customer trying admin route)
    cust_res = client.post("/api/auth/login", json={"email": "customer@example.com", "password": "Customer123!"})
    cust_token = cust_res.get_json()["token"]
    res_403 = client.get("/api/admin/users", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_403.status_code == 403
    assert res_403.is_json
    assert "error" in res_403.get_json()
