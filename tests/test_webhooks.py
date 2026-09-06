import pytest
import json
import time
import secrets
from server.app import create_app
from server.db import query_one, query_all, execute_write
from server.seed import seed_database
from server.security import create_access_token
from server.services.webhook_service import webhook_service, SUPPORTED_EVENTS

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

# 1. Test HMAC Signature Computation & Verification
def test_webhook_hmac_signature_verification():
    secret = "whsec_test_secret_key_12345"
    payload = b'{"event":"order.created","data":{"id":101}}'
    now_ts = int(time.time())

    sig_header = webhook_service.compute_signature(secret, now_ts, payload)
    assert sig_header.startswith(f"t={now_ts},v1=")

    # Valid verification
    assert webhook_service.verify_signature(secret, sig_header, payload, tolerance_seconds=300) is True

    # Tampered payload fails
    tampered_payload = b'{"event":"order.created","data":{"id":999}}'
    assert webhook_service.verify_signature(secret, sig_header, tampered_payload, tolerance_seconds=300) is False

    # Expired timestamp fails
    expired_ts = now_ts - 500
    expired_sig = webhook_service.compute_signature(secret, expired_ts, payload)
    assert webhook_service.verify_signature(secret, expired_sig, payload, tolerance_seconds=300) is False

# 2. Test Events Catalog Endpoint
def test_webhook_events_catalog(client, admin_token):
    res = client.get("/api/webhooks/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "events" in data
    assert "order.created" in data["events"]
    assert "order.fulfilled" in data["events"]
    assert "tracking.updated" in data["events"]
    assert "descriptions" in data

# 3. Test Webhook RBAC Authorization
def test_webhook_rbac_security(client, customer_token, admin_token):
    # Customer cannot access webhook management
    res_customer = client.get("/api/webhooks/subscriptions", headers={"Authorization": f"Bearer {customer_token}"})
    assert res_customer.status_code == 403

    # Admin can access
    res_admin = client.get("/api/webhooks/subscriptions", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200

# 4. Test Webhook Subscriptions CRUD
def test_webhook_subscription_crud(client, admin_token):
    # CREATE
    new_sub = {
        "url": "https://api.merchant-partner.com/webhooks/novadrop",
        "description": "Production ERP Integration",
        "events": ["order.created", "order.fulfilled"],
        "is_active": True
    }
    create_res = client.post(
        "/api/webhooks/subscriptions",
        json=new_sub,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    created_data = create_res.get_json()["subscription"]
    sub_id = created_data["id"]
    assert created_data["url"] == new_sub["url"]
    assert created_data["secret"].startswith("whsec_")
    assert "order.created" in created_data["events"]

    # GET SINGLE
    get_res = client.get(f"/api/webhooks/subscriptions/{sub_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert get_res.status_code == 200
    assert get_res.get_json()["subscription"]["id"] == sub_id

    # UPDATE
    update_res = client.put(
        f"/api/webhooks/subscriptions/{sub_id}",
        json={"url": "https://api.merchant-partner.com/v2/webhooks", "description": "Updated ERP v2"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.get_json()["subscription"]["url"] == "https://api.merchant-partner.com/v2/webhooks"
    assert update_res.get_json()["subscription"]["description"] == "Updated ERP v2"

    # DELETE
    del_res = client.delete(f"/api/webhooks/subscriptions/{sub_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 200
    assert del_res.get_json()["success"] is True

    # VERIFY DELETION
    not_found_res = client.get(f"/api/webhooks/subscriptions/{sub_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert not_found_res.status_code == 404

# 5. Test Mock Sandbox Test Receiver Endpoint
def test_sandbox_test_receiver(client):
    payload = {
        "id": "evt_test_001",
        "event": "order.created",
        "data": {"order_number": "ORD-TEST-99"}
    }
    res = client.post(
        "/api/webhooks/test-receiver",
        json=payload,
        headers={
            "X-NovaDrop-Event": "order.created",
            "X-NovaDrop-Delivery": "evt_test_001",
            "X-NovaDrop-Signature": "t=123,v1=abc"
        }
    )
    assert res.status_code == 200
    assert res.get_json()["status"] == "success"
    assert res.get_json()["event"] == "order.created"
    assert res.get_json()["signature_present"] is True

# 6. Test Outbound Test Ping, Delivery Logging & Resend
def test_webhook_test_ping_and_delivery_audit(client, admin_token):
    # Register mock test destination
    sub = {
        "url": "http://127.0.0.1:5000/api/webhooks/test-receiver",
        "description": "Integration Test Target",
        "events": ["*"],
        "is_active": True
    }
    create_res = client.post(
        "/api/webhooks/subscriptions",
        json=sub,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    sub_id = create_res.get_json()["subscription"]["id"]

    # Trigger test ping
    ping_res = client.post(
        f"/api/webhooks/subscriptions/{sub_id}/test",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert ping_res.status_code == 200
    ping_data = ping_res.get_json()
    assert "details" in ping_data
    assert "delivery_id" in ping_data["details"]

    # Check deliveries log list
    deliv_res = client.get("/api/webhooks/deliveries", headers={"Authorization": f"Bearer {admin_token}"})
    assert deliv_res.status_code == 200
    deliveries = deliv_res.get_json()["deliveries"]
    assert len(deliveries) > 0
    latest = deliveries[0]
    assert latest["event_name"] == "test.ping"

    # Test resend
    resend_res = client.post(
        f"/api/webhooks/deliveries/{latest['id']}/resend",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resend_res.status_code == 200
    assert resend_res.get_json()["status"] == "resent"

# 7. Test Checkout Emits Webhook Events
def test_checkout_emits_webhook_event(client, customer_token):
    cart_items = [
        {"product_id": 1, "variant_id": 1, "quantity": 1}
    ]
    checkout_payload = {
        "items": cart_items,
        "shipping_address": {
            "full_name": "Webhook Buyer",
            "street_address": "456 Test Lane",
            "city": "Austin",
            "state": "TX",
            "postal_code": "78701",
            "country": "United States"
        },
        "shipping_method": "standard",
        "card_token": "tok_visa_4242"
    }

    res = client.post(
        "/api/checkout/place-order",
        json=checkout_payload,
        headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert res.status_code == 201
    order_num = res.get_json()["order_number"]

    # Cancel order to test order.cancelled emission
    cancel_res = client.post(
        f"/api/orders/{order_num}/cancel",
        json={"reason": "Customer cancellation test"},
        headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()["order_status"] == "cancelled"
