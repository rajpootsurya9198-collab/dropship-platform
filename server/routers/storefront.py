import json
from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth, optional_auth

storefront_bp = Blueprint("storefront", __name__)

@storefront_bp.route("/categories", methods=["GET"])
def get_categories():
    sql = """
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
    """
    categories = query_all(sql)
    return jsonify({"categories": categories})

@storefront_bp.route("/products", methods=["GET"])
@optional_auth
def get_products():
    category_param = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    sort_by = request.args.get("sort", "featured").strip()
    page = max(1, request.args.get("page", 1, type=int))
    limit = min(50, max(1, request.args.get("limit", 20, type=int)))
    offset = (page - 1) * limit
    
    where_clauses = ["p.is_active = 1"]
    params = []

    if category_param:
        if category_param.isdigit():
            where_clauses.append("p.category_id = ?")
            params.append(int(category_param))
        else:
            where_clauses.append("c.slug = ?")
            params.append(category_param)

    if search:
        where_clauses.append("(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.sku LIKE ?)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    if min_price is not None:
        where_clauses.append("p.retail_price >= ?")
        params.append(min_price)

    if max_price is not None:
        where_clauses.append("p.retail_price <= ?")
        params.append(max_price)

    order_sql = "p.is_featured DESC, p.created_at DESC"
    if sort_by == "price_asc":
        order_sql = "p.retail_price ASC"
    elif sort_by == "price_desc":
        order_sql = "p.retail_price DESC"
    elif sort_by == "rating":
        order_sql = "p.rating_avg DESC, p.rating_count DESC"
    elif sort_by == "newest":
        order_sql = "p.created_at DESC"

    where_sql = " AND ".join(where_clauses)
    
    # Total count query
    count_sql = f"""
        SELECT COUNT(p.id) as total
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE {where_sql}
    """
    total_count = query_one(count_sql, params)["total"]

    # Products query
    query_sql = f"""
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               s.name as supplier_name, s.shipping_origin, s.fulfillment_sla_days, s.rating as supplier_rating
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    products = query_all(query_sql, params)

    for p in products:
        try:
            p["images"] = json.loads(p["images_json"]) if p["images_json"] else []
        except Exception:
            p["images"] = []
        p["primary_image"] = p["images"][0] if p["images"] else "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"

    return jsonify({
        "products": products,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    })

@storefront_bp.route("/products/<id_or_slug>", methods=["GET"])
@optional_auth
def get_product_detail(id_or_slug):
    if id_or_slug.isdigit():
        p = query_one(
            """SELECT p.*, c.name as category_name, c.slug as category_slug,
                      s.name as supplier_name, s.shipping_origin, s.fulfillment_sla_days,
                      s.rating as supplier_rating, s.return_policy as supplier_return_policy
               FROM products p
               JOIN categories c ON p.category_id = c.id
               JOIN suppliers s ON p.supplier_id = s.id
               WHERE p.id = ? AND p.is_active = 1""",
            (int(id_or_slug),)
        )
    else:
        p = query_one(
            """SELECT p.*, c.name as category_name, c.slug as category_slug,
                      s.name as supplier_name, s.shipping_origin, s.fulfillment_sla_days,
                      s.rating as supplier_rating, s.return_policy as supplier_return_policy
               FROM products p
               JOIN categories c ON p.category_id = c.id
               JOIN suppliers s ON p.supplier_id = s.id
               WHERE p.slug = ? AND p.is_active = 1""",
            (id_or_slug,)
        )

    if not p:
        return jsonify({"error": "Product not found or currently unavailable."}), 404

    try:
        p["images"] = json.loads(p["images_json"]) if p["images_json"] else []
    except Exception:
        p["images"] = []
    p["primary_image"] = p["images"][0] if p["images"] else ""

    # Fetch variants
    variants = query_all(
        "SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC",
        (p["id"],)
    )
    p["variants"] = variants

    # Fetch approved reviews
    reviews = query_all(
        "SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC",
        (p["id"],)
    )
    p["reviews"] = reviews

    # Fetch related products in same category
    related = query_all(
        """SELECT id, title, slug, retail_price, compare_at_price, rating_avg, rating_count, images_json
           FROM products
           WHERE category_id = ? AND id != ? AND is_active = 1
           LIMIT 4""",
        (p["category_id"], p["id"])
    )
    for r in related:
        try:
            imgs = json.loads(r["images_json"]) if r["images_json"] else []
            r["primary_image"] = imgs[0] if imgs else ""
        except Exception:
            r["primary_image"] = ""
    p["related_products"] = related

    # Check if wishlisted by current user
    p["is_wishlisted"] = False
    if getattr(g, "current_user", None):
        wish = query_one(
            "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?",
            (g.current_user["id"], p["id"])
        )
        p["is_wishlisted"] = bool(wish)

    return jsonify({"product": p})

@storefront_bp.route("/reviews/<int:product_id>", methods=["GET", "POST"])
@optional_auth
def handle_product_reviews(product_id):
    if request.method == "GET":
        reviews = query_all(
            "SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC",
            (product_id,)
        )
        return jsonify({"reviews": reviews})
    
    # POST new review
    data = request.get_json() or {}
    rating = int(data.get("rating", 5))
    title = data.get("title", "").strip()
    comment = data.get("comment", "").strip()
    user_name = data.get("user_name", "").strip()
    user_email = data.get("user_email", "").strip()

    if not title or not comment:
        return jsonify({"error": "Review title and comment are required."}), 400
    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5 stars."}), 400

    user_id = None
    if getattr(g, "current_user", None):
        user_id = g.current_user["id"]
        user_name = g.current_user["full_name"]
        user_email = g.current_user["email"]

    if not user_name:
        user_name = "Verified Customer"
    if not user_email:
        user_email = "shopper@example.com"

    # Check if product exists
    prod = query_one("SELECT id FROM products WHERE id = ?", (product_id,))
    if not prod:
        return jsonify({"error": "Product not found."}), 404

    review_id = execute_write(
        """INSERT INTO reviews (product_id, user_id, user_name, user_email, rating, title, comment, verified_purchase, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'approved')""",
        (product_id, user_id, user_name, user_email, rating, title, comment)
    )

    # Recalculate product rating stats
    rating_stats = query_one(
        "SELECT AVG(rating) as avg_rating, COUNT(id) as count FROM reviews WHERE product_id = ? AND status = 'approved'",
        (product_id,)
    )
    if rating_stats:
        new_avg = round(rating_stats["avg_rating"] or 5.0, 1)
        new_count = rating_stats["count"]
        execute_write(
            "UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?",
            (new_avg, new_count, product_id)
        )

    return jsonify({"message": "Thank you! Your review has been published.", "review_id": review_id}), 201

@storefront_bp.route("/wishlist", methods=["GET"])
@require_auth()
def get_wishlist():
    user_id = g.current_user["id"]
    sql = """
        SELECT p.*, c.name as category_name, w.created_at as wishlisted_at
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE w.user_id = ? AND p.is_active = 1
        ORDER BY w.created_at DESC
    """
    items = query_all(sql, (user_id,))
    for item in items:
        try:
            imgs = json.loads(item["images_json"]) if item["images_json"] else []
            item["primary_image"] = imgs[0] if imgs else ""
        except Exception:
            item["primary_image"] = ""
    return jsonify({"wishlist": items})

@storefront_bp.route("/wishlist/toggle", methods=["POST"])
@require_auth()
def toggle_wishlist():
    user_id = g.current_user["id"]
    data = request.get_json() or {}
    product_id = data.get("product_id")
    if not product_id:
        return jsonify({"error": "Product ID is required."}), 400

    existing = query_one("SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?", (user_id, product_id))
    if existing:
        execute_write("DELETE FROM wishlists WHERE id = ?", (existing["id"],))
        return jsonify({"message": "Removed from wishlist.", "is_wishlisted": False})
    else:
        execute_write("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (user_id, product_id))
        return jsonify({"message": "Added to wishlist.", "is_wishlisted": True})
