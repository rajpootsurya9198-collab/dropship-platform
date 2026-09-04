import json
import random
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import optional_auth, log_audit
from ..config import DEFAULT_TAX_RATE, DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_STANDARD_SHIPPING_FEE, DEFAULT_EXPRESS_SHIPPING_FEE

checkout_bp = Blueprint("checkout", __name__)

def generate_order_number():
    random_digits = ''.join(random.choices(string.digits, k=5))
    return f"ORD-{random_digits}"

def generate_fulfillment_number(order_number, index):
    return f"FUL-{order_number.replace('ORD-', '')}-{index}"

@checkout_bp.route("/validate-coupon", methods=["POST"])
def validate_coupon():
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    subtotal = float(data.get("subtotal", 0.0))

    if not code:
        return jsonify({"error": "Coupon code is required."}), 400

    coupon = query_one(
        "SELECT * FROM coupons WHERE code = ? AND is_active = 1",
        (code,)
    )

    if not coupon:
        return jsonify({"error": "Invalid or expired promo code."}), 404

    if coupon["usage_limit"] and coupon["times_used"] >= coupon["usage_limit"]:
        return jsonify({"error": "This coupon has reached its maximum usage limit."}), 400

    if subtotal < coupon["min_purchase_amount"]:
        return jsonify({
            "error": f"Minimum purchase amount of ${coupon['min_purchase_amount']:.2f} required for coupon {code}."
        }), 400

    discount_amount = 0.0
    if coupon["discount_type"] == "percentage":
        discount_amount = subtotal * (coupon["discount_value"] / 100.0)
        if coupon["max_discount_amount"] and discount_amount > coupon["max_discount_amount"]:
            discount_amount = coupon["max_discount_amount"]
    elif coupon["discount_type"] == "fixed_amount":
        discount_amount = min(coupon["discount_value"], subtotal)

    discount_amount = round(discount_amount, 2)

    return jsonify({
        "valid": True,
        "code": coupon["code"],
        "description": coupon["description"],
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "discount_amount": discount_amount
    })

@checkout_bp.route("/calculate-shipping", methods=["POST"])
def calculate_shipping():
    data = request.get_json() or {}
    subtotal = float(data.get("subtotal", 0.0))
    shipping_method = data.get("shipping_method", "standard") # standard or express

    shipping_fee = DEFAULT_STANDARD_SHIPPING_FEE
    if shipping_method == "express":
        shipping_fee = DEFAULT_EXPRESS_SHIPPING_FEE
    else:
        if subtotal >= DEFAULT_FREE_SHIPPING_THRESHOLD:
            shipping_fee = 0.0

    tax_amount = round(subtotal * DEFAULT_TAX_RATE, 2)
    
    return jsonify({
        "shipping_method": shipping_method,
        "shipping_fee": shipping_fee,
        "tax_amount": tax_amount,
        "free_shipping_threshold": DEFAULT_FREE_SHIPPING_THRESHOLD,
        "qualifies_for_free_shipping": (subtotal >= DEFAULT_FREE_SHIPPING_THRESHOLD and shipping_method == "standard")
    })

@checkout_bp.route("/place-order", methods=["POST"])
@optional_auth
def place_order():
    data = request.get_json() or {}
    items = data.get("items", [])
    shipping_address = data.get("shipping_address", {})
    billing_address = data.get("billing_address", shipping_address)
    customer_info = data.get("customer_info", {})
    coupon_code = data.get("coupon_code", "").strip().upper()
    shipping_method = data.get("shipping_method", "standard")
    payment_method = data.get("payment_method", "card")
    customer_notes = data.get("customer_notes", "").strip()

    if not items:
        return jsonify({"error": "Cart is empty. Please add items before checking out."}), 400

    if not shipping_address.get("street_address") or not shipping_address.get("city") or not shipping_address.get("postal_code"):
        return jsonify({"error": "Complete shipping address is required."}), 400

    customer_email = customer_info.get("email", "").strip().lower()
    customer_name = customer_info.get("name", "").strip()
    customer_phone = customer_info.get("phone", "").strip()

    user_id = None
    if getattr(g, "current_user", None):
        user_id = g.current_user["id"]
        if not customer_email:
            customer_email = g.current_user["email"]
        if not customer_name:
            customer_name = g.current_user["full_name"]
        if not customer_phone:
            customer_phone = g.current_user.get("phone", "")

    if not customer_email or "@" not in customer_email:
        return jsonify({"error": "Valid customer email is required."}), 400
    if not customer_name:
        customer_name = shipping_address.get("full_name", "Shopper")

    # Validate items, stock, and calculate subtotal
    subtotal = 0.0
    validated_items = []

    for item in items:
        prod_id = item.get("product_id")
        var_id = item.get("variant_id")
        qty = max(1, int(item.get("quantity", 1)))

        product = query_one("SELECT * FROM products WHERE id = ? AND is_active = 1", (prod_id,))
        if not product:
            return jsonify({"error": f"Product ID {prod_id} is unavailable or out of stock."}), 400

        variant = None
        cost_price = product["cost_price"]
        retail_price = product["retail_price"]
        sku = product["sku"]
        variant_title = ""

        if var_id:
            variant = query_one("SELECT * FROM product_variants WHERE id = ? AND product_id = ?", (var_id, prod_id))
            if variant:
                cost_price = variant["cost_price"]
                retail_price = variant["retail_price"]
                sku = variant["sku"]
                variant_title = variant["title"]
                if variant["stock_quantity"] < qty:
                    return jsonify({"error": f"Insufficient stock for variant {variant['title']} (Available: {variant['stock_quantity']})."}), 400
            else:
                return jsonify({"error": f"Selected variant not found for {product['title']}."}), 400
        else:
            if product["stock_quantity"] < qty:
                return jsonify({"error": f"Insufficient stock for {product['title']} (Available: {product['stock_quantity']})."}), 400

        line_total = round(retail_price * qty, 2)
        subtotal += line_total

        validated_items.append({
            "product_id": prod_id,
            "variant_id": var_id,
            "supplier_id": product["supplier_id"],
            "title": product["title"],
            "variant_title": variant_title,
            "sku": sku,
            "unit_price": retail_price,
            "cost_price": cost_price,
            "quantity": qty,
            "total_price": line_total
        })

    subtotal = round(subtotal, 2)

    # Apply Coupon Discount
    discount_amount = 0.0
    applied_coupon = None
    if coupon_code:
        coupon = query_one("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (coupon_code,))
        if coupon and subtotal >= coupon["min_purchase_amount"]:
            applied_coupon = coupon
            if coupon["discount_type"] == "percentage":
                discount_amount = subtotal * (coupon["discount_value"] / 100.0)
                if coupon["max_discount_amount"] and discount_amount > coupon["max_discount_amount"]:
                    discount_amount = coupon["max_discount_amount"]
            elif coupon["discount_type"] == "fixed_amount":
                discount_amount = min(coupon["discount_value"], subtotal)
            discount_amount = round(discount_amount, 2)

    # Shipping Fee Calculation
    shipping_fee = DEFAULT_STANDARD_SHIPPING_FEE
    if shipping_method == "express":
        shipping_fee = DEFAULT_EXPRESS_SHIPPING_FEE
    else:
        if subtotal >= DEFAULT_FREE_SHIPPING_THRESHOLD:
            shipping_fee = 0.0

    tax_amount = round((subtotal - discount_amount) * DEFAULT_TAX_RATE, 2)
    total_amount = round((subtotal - discount_amount) + shipping_fee + tax_amount, 2)

    order_number = generate_order_number()
    tx_id = f"tx_sim_{random.randint(10000000, 99999999)}"
    now = datetime.now()

    # Save to Database within transaction
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Insert Order
        cursor.execute(
            """INSERT INTO orders (
                order_number, user_id, customer_email, customer_name, customer_phone,
                shipping_address_json, billing_address_json, subtotal, discount_amount,
                coupon_code, shipping_fee, tax_amount, total_amount, currency,
                payment_status, payment_method, payment_transaction_id, order_status,
                customer_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', 'paid', 'card', ?, 'processing', ?, ?)""",
            (
                order_number, user_id, customer_email, customer_name, customer_phone,
                json.dumps(shipping_address), json.dumps(billing_address),
                subtotal, discount_amount, coupon_code if applied_coupon else None,
                shipping_fee, tax_amount, total_amount, tx_id,
                customer_notes, now.strftime("%Y-%m-%d %H:%M:%S")
            )
        )
        order_id = cursor.lastrowid

        # 2. Insert Order Items
        for item in validated_items:
            cursor.execute(
                """INSERT INTO order_items (
                    order_id, product_id, variant_id, supplier_id, title,
                    variant_title, sku, unit_price, cost_price, quantity,
                    total_price, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'routed')""",
                (
                    order_id, item["product_id"], item["variant_id"], item["supplier_id"],
                    item["title"], item["variant_title"], item["sku"],
                    item["unit_price"], item["cost_price"], item["quantity"],
                    item["total_price"]
                )
            )

            # Atomic stock deduction with race condition prevention
            if item["variant_id"]:
                cursor.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
                    (item["quantity"], item["variant_id"], item["quantity"])
                )
                if cursor.rowcount == 0:
                    raise ValueError(f"Concurrency stock race condition: {item['variant_title'] or item['title']} just sold out.")

            cursor.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
                (item["quantity"], item["product_id"], item["quantity"])
            )
            if cursor.rowcount == 0:
                raise ValueError(f"Concurrency stock race condition: {item['title']} just sold out.")

        # 3. Auto-Route Fulfillments by Supplier (Dropshipping Core)
        supplier_ids = list(set([it["supplier_id"] for it in validated_items]))
        fulfillments_created = []

        for idx, s_id in enumerate(supplier_ids, start=1):
            ful_number = generate_fulfillment_number(order_number, idx)
            carrier = "YunExpress" if s_id == 1 else "DHL" if s_id == 2 else "FedEx"
            tracking_num = f"{carrier.upper()[:3]}-{random.randint(10000000, 99999999)}US"
            tracking_url = f"https://track.example.com/{tracking_num}"

            try:
                cursor.execute(
                    """INSERT INTO fulfillments (
                        order_id, supplier_id, fulfillment_number, tracking_number,
                        carrier, carrier_service, tracking_url, status,
                        estimated_delivery_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'Priority Line', ?, 'label_created', ?, ?)""",
                    (
                        order_id, s_id, ful_number, tracking_num, carrier,
                        tracking_url, (now + timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"),
                        now.strftime("%Y-%m-%d %H:%M:%S")
                    )
                )
                ful_id = cursor.lastrowid

                # Initial Checkpoints
                cursor.execute(
                    """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
                       VALUES (?, 'order_placed', 'Platform Order System', 'Order placed and paid. Routed to dropship supplier.', ?)""",
                    (ful_id, now.strftime("%Y-%m-%d %H:%M:%S"))
                )
                cursor.execute(
                    """INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time)
                       VALUES (?, 'supplier_confirmed', 'Supplier Fulfillment Center', 'Supplier received electronic dispatch manifest.', ?)""",
                    (ful_id, (now + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"))
                )

                fulfillments_created.append({
                    "fulfillment_id": ful_id,
                    "fulfillment_number": ful_number,
                    "tracking_number": tracking_num,
                    "carrier": carrier
                })
            except Exception as fe:
                # Resilient fallback: preserve paid order for manual retry
                cursor.execute(
                    "UPDATE orders SET order_status = 'processing', customer_notes = customer_notes || ' [Supplier dispatch queued for retry]' WHERE id = ?",
                    (order_id,)
                )

        # 4. Increment Coupon usage
        if applied_coupon:
            cursor.execute(
                "UPDATE coupons SET times_used = times_used + 1 WHERE id = ?",
                (applied_coupon["id"],)
            )

    log_audit("ORDER_PLACED", "orders", order_id, {
        "order_number": order_number,
        "total_amount": total_amount,
        "suppliers_count": len(supplier_ids)
    })

    return jsonify({
        "message": "Order placed and paid successfully!",
        "order_id": order_id,
        "order_number": order_number,
        "total_amount": total_amount,
        "payment_status": "paid",
        "fulfillments": fulfillments_created,
        "tracking_url": f"/#tracking?order={order_number}"
    }), 201
