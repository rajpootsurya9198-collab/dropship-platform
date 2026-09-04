import pytest
import json
import secrets
from server.app import create_app
from server.db import query_one, query_all, execute_write
from server.seed import seed_database
from server.services.payment_service import payment_service, MockStripePaymentProvider
from server.services.supplier_service import supplier_service

@pytest.fixture(scope="module")
def app():
    seed_database()
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture(scope="module")
def client(app):
    return app.test_client()

# 1. Test Payment Provider Abstraction & Checkout Session
def test_payment_provider_checkout_session():
    provider = MockStripePaymentProvider()
    res = provider.create_checkout_session(order_id=1, amount=79.99, currency="USD")
    assert "session_id" in res
    assert "payment_intent_id" in res
    assert res["amount"] == 79.99
    assert res["currency"] == "USD"

# 2. Test Payment Service Capture & Verification
def test_payment_service_process():
    order = query_one("SELECT id, total_amount FROM orders LIMIT 1")
    res = payment_service.process_order_payment(order["id"], order["total_amount"], "USD")
    assert res["success"] is True
    assert "transaction_id" in res

    # Verify order status in DB
    updated = query_one("SELECT payment_status FROM orders WHERE id = ?", (order["id"],))
    assert updated["payment_status"] == "paid"

# 3. Test Webhook Idempotency (Duplicate Webhook Prevention)
def test_webhook_idempotency(client):
    idempotency_key = f"idem_{secrets.token_hex(8)}"
    payload = json.dumps({
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "amount": 7999,
                "metadata": {"order_number": "ORD-88201"}
            }
        }
    }).encode("utf-8")

    # First call -> Should process successfully
    res1 = client.post("/api/webhooks/payment", data=payload, headers={
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key
    })
    assert res1.status_code == 200
    assert res1.get_json()["status"] == "success"

    # Second duplicate call with same idempotency key -> Should recognize already processed
    res2 = client.post("/api/webhooks/payment", data=payload, headers={
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key
    })
    assert res2.status_code == 200
    assert res2.get_json()["status"] == "already_processed"

# 4. Test Supplier Service Auto-Dispatch & Tracking Generation
def test_supplier_service_dispatch():
    item = query_one("SELECT order_id, supplier_id FROM order_items LIMIT 1")
    res = supplier_service.dispatch_supplier_order(item["order_id"], item["supplier_id"])
    assert "fulfillment_id" in res
    assert "tracking_number" in res
    assert "carrier" in res

# 5. Test Supplier Inventory Sync
def test_supplier_inventory_sync():
    res = supplier_service.sync_all_supplier_inventory()
    assert res["status"] == "synced"
    assert res["items_updated"] > 0

# 6. Test SEO Sitemap & Robots.txt
def test_seo_sitemap(client):
    res = client.get("/sitemap.xml")
    assert res.status_code == 200
    assert "application/xml" in res.content_type
    assert b"<urlset" in res.data
    assert b"<loc>https://novadrop.io/</loc>" in res.data

def test_seo_robots(client):
    res = client.get("/robots.txt")
    assert res.status_code == 200
    assert b"User-agent: *" in res.data
    assert b"Sitemap: https://novadrop.io/sitemap.xml" in res.data

def test_seo_product_structured_data(client):
    res = client.get("/api/seo/product/aurasound-pro-anc-headphones")
    assert res.status_code == 200
    data = res.get_json()
    assert "schema_json_ld" in data
    assert data["schema_json_ld"]["@type"] == "Product"
    assert data["schema_json_ld"]["name"] == "AuraSound Pro Hybrid Active Noise-Cancelling Headphones"
