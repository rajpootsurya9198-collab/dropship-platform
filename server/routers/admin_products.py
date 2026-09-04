import json
import re
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import require_auth, log_audit

admin_products_bp = Blueprint("admin_products", __name__)

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

@admin_products_bp.route("/products", methods=["GET"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def list_products():
    user = g.current_user
    search = request.args.get("search", "").strip()
    category_id = request.args.get("category_id", type=int)
    supplier_id = request.args.get("supplier_id", type=int)
    low_stock = request.args.get("low_stock", type=int)
    
    where_clauses = ["1=1"]
    params = []

    # If supplier role, filter only to their products
    if user["role"] == "supplier":
        sup = query_one("SELECT id FROM suppliers WHERE user_id = ? OR email = ?", (user["id"], user["email"]))
        if sup:
            where_clauses.append("p.supplier_id = ?")
            params.append(sup["id"])

    if supplier_id and user["role"] in ["admin", "merchant"]:
        where_clauses.append("p.supplier_id = ?")
        params.append(supplier_id)

    if category_id:
        where_clauses.append("p.category_id = ?")
        params.append(category_id)

    if low_stock:
        where_clauses.append("p.stock_quantity <= p.low_stock_threshold")

    if search:
        where_clauses.append("(p.title LIKE ? OR p.sku LIKE ? OR p.tags LIKE ?)")
        pat = f"%{search}%"
        params.extend([pat, pat, pat])

    where_sql = " AND ".join(where_clauses)
    sql = f"""
        SELECT p.*, c.name as category_name, s.name as supplier_name, s.shipping_origin,
               (SELECT COUNT(pv.id) FROM product_variants pv WHERE pv.product_id = p.id) as variant_count
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE {where_sql}
        ORDER BY p.id DESC
    """
    products = query_all(sql, params)

    for p in products:
        try:
            p["images"] = json.loads(p["images_json"]) if p["images_json"] else []
        except Exception:
            p["images"] = []
        p["primary_image"] = p["images"][0] if p["images"] else ""
        
        # Calculate Margin
        cost = p["cost_price"]
        retail = p["retail_price"]
        profit = round(retail - cost, 2)
        margin_pct = round((profit / retail * 100) if retail > 0 else 0, 1)
        p["profit_margin_usd"] = profit
        p["profit_margin_percent"] = margin_pct

    return jsonify({"products": products, "count": len(products)})

@admin_products_bp.route("/products", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def create_product():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    category_id = data.get("category_id")
    supplier_id = data.get("supplier_id")
    cost_price = float(data.get("cost_price", 0.0))
    retail_price = float(data.get("retail_price", 0.0))
    compare_at_price = float(data.get("compare_at_price", 0.0)) if data.get("compare_at_price") else None
    sku = data.get("sku", "").strip().upper()
    stock_quantity = int(data.get("stock_quantity", 0))
    low_stock_threshold = int(data.get("low_stock_threshold", 10))
    weight_kg = float(data.get("weight_kg", 0.5))
    short_description = data.get("short_description", "").strip()
    description = data.get("description", "").strip()
    tags = data.get("tags", "").strip()
    images = data.get("images", [])
    variants = data.get("variants", [])
    is_active = 1 if data.get("is_active", True) else 0
    is_featured = 1 if data.get("is_featured", False) else 0

    if not title or not category_id or not supplier_id or not sku:
        return jsonify({"error": "Title, category, supplier, and SKU are required."}), 400

    if not images:
        images = ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"]

    slug_base = slugify(title)
    slug = slug_base
    counter = 1
    while query_one("SELECT id FROM products WHERE slug = ?", (slug,)):
        slug = f"{slug_base}-{counter}"
        counter += 1

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO products (
                supplier_id, category_id, title, slug, description, short_description,
                cost_price, retail_price, compare_at_price, sku, stock_quantity,
                low_stock_threshold, weight_kg, is_active, is_featured, tags, images_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                supplier_id, category_id, title, slug, description, short_description,
                cost_price, retail_price, compare_at_price, sku, stock_quantity,
                low_stock_threshold, weight_kg, is_active, is_featured, tags, json.dumps(images)
            )
        )
        product_id = cursor.lastrowid

        for v in variants:
            v_title = v.get("title", "Default").strip()
            v_sku = v.get("sku", f"{sku}-{v_title[:3].upper()}").strip()
            v_cost = float(v.get("cost_price", cost_price))
            v_price = float(v.get("retail_price", retail_price))
            v_stock = int(v.get("stock_quantity", stock_quantity))
            opt1_name = v.get("option1_name")
            opt1_val = v.get("option1_value")

            cursor.execute(
                """INSERT INTO product_variants (
                    product_id, title, sku, cost_price, retail_price, stock_quantity,
                    option1_name, option1_value
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (product_id, v_title, v_sku, v_cost, v_price, v_stock, opt1_name, opt1_val)
            )

    log_audit("PRODUCT_CREATED", "products", product_id, {"title": title, "sku": sku})

    return jsonify({"message": "Product created successfully.", "product_id": product_id, "slug": slug}), 201

@admin_products_bp.route("/products/<int:prod_id>", methods=["GET", "PUT", "DELETE"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def handle_product_by_id(prod_id):
    product = query_one("SELECT * FROM products WHERE id = ?", (prod_id,))
    if not product:
        return jsonify({"error": "Product not found."}), 404

    if request.method == "GET":
        try:
            product["images"] = json.loads(product["images_json"]) if product["images_json"] else []
        except Exception:
            product["images"] = []
        product["variants"] = query_all("SELECT * FROM product_variants WHERE product_id = ?", (prod_id,))
        return jsonify({"product": product})

    elif request.method == "DELETE":
        execute_write("DELETE FROM products WHERE id = ?", (prod_id,))
        log_audit("PRODUCT_DELETED", "products", prod_id, {"sku": product["sku"]})
        return jsonify({"message": "Product deleted successfully."})

    elif request.method == "PUT":
        data = request.get_json() or {}
        title = data.get("title", product["title"]).strip()
        category_id = data.get("category_id", product["category_id"])
        supplier_id = data.get("supplier_id", product["supplier_id"])
        cost_price = float(data.get("cost_price", product["cost_price"]))
        retail_price = float(data.get("retail_price", product["retail_price"]))
        compare_at_price = float(data.get("compare_at_price", product["compare_at_price"])) if data.get("compare_at_price") else None
        sku = data.get("sku", product["sku"]).strip().upper()
        stock_quantity = int(data.get("stock_quantity", product["stock_quantity"]))
        low_stock_threshold = int(data.get("low_stock_threshold", product["low_stock_threshold"]))
        weight_kg = float(data.get("weight_kg", product["weight_kg"]))
        short_description = data.get("short_description", product["short_description"]).strip()
        description = data.get("description", product["description"]).strip()
        tags = data.get("tags", product["tags"]).strip()
        is_active = 1 if data.get("is_active", product["is_active"]) else 0
        is_featured = 1 if data.get("is_featured", product["is_featured"]) else 0
        
        images = data.get("images")
        images_json = json.dumps(images) if images is not None else product["images_json"]

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE products SET
                    title = ?, category_id = ?, supplier_id = ?, cost_price = ?, retail_price = ?,
                    compare_at_price = ?, sku = ?, stock_quantity = ?, low_stock_threshold = ?,
                    weight_kg = ?, short_description = ?, description = ?, tags = ?,
                    is_active = ?, is_featured = ?, images_json = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (
                    title, category_id, supplier_id, cost_price, retail_price,
                    compare_at_price, sku, stock_quantity, low_stock_threshold,
                    weight_kg, short_description, description, tags,
                    is_active, is_featured, images_json, prod_id
                )
            )

            # Update variants if supplied
            if "variants" in data and isinstance(data["variants"], list):
                cursor.execute("DELETE FROM product_variants WHERE product_id = ?", (prod_id,))
                for v in data["variants"]:
                    cursor.execute(
                        """INSERT INTO product_variants (
                            product_id, title, sku, cost_price, retail_price, stock_quantity,
                            option1_name, option1_value
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            prod_id, v.get("title", "Default"), v.get("sku", f"{sku}-VAR"),
                            float(v.get("cost_price", cost_price)), float(v.get("retail_price", retail_price)),
                            int(v.get("stock_quantity", stock_quantity)),
                            v.get("option1_name"), v.get("option1_value")
                        )
                    )

        log_audit("PRODUCT_UPDATED", "products", prod_id, {"title": title, "sku": sku})
        return jsonify({"message": "Product updated successfully."})

@admin_products_bp.route("/products/<int:prod_id>/stock", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant", "supplier"])
def adjust_stock(prod_id):
    data = request.get_json() or {}
    new_stock = int(data.get("stock_quantity", 0))
    execute_write("UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_stock, prod_id))
    log_audit("STOCK_ADJUSTED", "products", prod_id, {"new_stock": new_stock})
    return jsonify({"message": "Stock updated successfully.", "stock_quantity": new_stock})

@admin_products_bp.route("/products/bulk-markup", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def bulk_markup():
    data = request.get_json() or {}
    markup_type = data.get("markup_type", "multiplier") # multiplier, percentage, fixed_amount
    markup_value = float(data.get("markup_value", 2.0))
    rounding = data.get("rounding_format", "99") # 99, 95, exact
    category_id = data.get("category_id")

    sql = "SELECT id, cost_price FROM products"
    params = []
    if category_id:
        sql += " WHERE category_id = ?"
        params.append(category_id)

    products = query_all(sql, params)
    updated_count = 0

    with get_db() as conn:
        cursor = conn.cursor()
        for p in products:
            cost = p["cost_price"]
            if markup_type == "multiplier":
                raw_price = cost * markup_value
            elif markup_type == "percentage":
                raw_price = cost * (1.0 + (markup_value / 100.0))
            elif markup_type == "fixed_amount":
                raw_price = cost + markup_value
            else:
                raw_price = cost * 2.0

            if rounding == "99":
                new_price = int(raw_price) + 0.99
            elif rounding == "95":
                new_price = int(raw_price) + 0.95
            else:
                new_price = round(raw_price, 2)

            cursor.execute(
                "UPDATE products SET retail_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_price, p["id"])
            )
            cursor.execute(
                "UPDATE product_variants SET retail_price = ? WHERE product_id = ?",
                (new_price, p["id"])
            )
            updated_count += 1

    log_audit("BULK_MARKUP_APPLIED", "products", None, {
        "updated_count": updated_count,
        "markup_type": markup_type,
        "markup_value": markup_value
    })

    return jsonify({"message": f"Updated retail pricing for {updated_count} products.", "updated_count": updated_count})

@admin_products_bp.route("/categories", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_categories():
    if request.method == "GET":
        categories = query_all("""
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.name ASC
        """)
        return jsonify({"categories": categories})

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    image_url = data.get("image_url", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500")
    icon = data.get("icon", "tag")
    sort_order = int(data.get("sort_order", 0))

    if not name:
        return jsonify({"error": "Category name is required."}), 400

    slug_base = slugify(name)
    slug = slug_base
    counter = 1
    while query_one("SELECT id FROM categories WHERE slug = ?", (slug,)):
        slug = f"{slug_base}-{counter}"
        counter += 1

    cat_id = execute_write(
        """INSERT INTO categories (name, slug, description, image_url, icon, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (name, slug, description, image_url, icon, sort_order)
    )

    log_audit("CATEGORY_CREATED", "categories", cat_id, {"name": name, "slug": slug})
    return jsonify({"message": "Category created.", "category_id": cat_id, "slug": slug}), 201

@admin_products_bp.route("/categories/<int:cat_id>", methods=["PUT", "DELETE"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_category_by_id(cat_id):
    cat = query_one("SELECT * FROM categories WHERE id = ?", (cat_id,))
    if not cat:
        return jsonify({"error": "Category not found."}), 404

    if request.method == "DELETE":
        execute_write("DELETE FROM categories WHERE id = ?", (cat_id,))
        log_audit("CATEGORY_DELETED", "categories", cat_id)
        return jsonify({"message": "Category deleted."})

    data = request.get_json() or {}
    name = data.get("name", cat["name"]).strip()
    description = data.get("description", cat["description"]).strip()
    image_url = data.get("image_url", cat["image_url"])
    icon = data.get("icon", cat["icon"])
    sort_order = int(data.get("sort_order", cat["sort_order"]))
    is_active = 1 if data.get("is_active", cat["is_active"]) else 0

    execute_write(
        """UPDATE categories SET name = ?, description = ?, image_url = ?, icon = ?, sort_order = ?, is_active = ?
           WHERE id = ?""",
        (name, description, image_url, icon, sort_order, is_active, cat_id)
    )

    log_audit("CATEGORY_UPDATED", "categories", cat_id)
    return jsonify({"message": "Category updated."})
