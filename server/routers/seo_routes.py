import json
from flask import Blueprint, Response, jsonify, request
from ..db import query_all, query_one

seo_bp = Blueprint("seo", __name__)

@seo_bp.route("/sitemap.xml", methods=["GET"])
def sitemap():
    products = query_all("SELECT slug, updated_at FROM products WHERE is_active = 1")
    categories = query_all("SELECT slug FROM categories WHERE is_active = 1")
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://novadrop.io/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>',
        '  <url><loc>https://novadrop.io/#store</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
        '  <url><loc>https://novadrop.io/#tracking</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>'
    ]

    for c in categories:
        xml_lines.append(f'  <url><loc>https://novadrop.io/#store?category={c["slug"]}</loc><priority>0.8</priority></url>')

    for p in products:
        lastmod = p["updated_at"].split(" ")[0] if p.get("updated_at") else "2026-08-31"
        xml_lines.append(f'  <url><loc>https://novadrop.io/#product/{p["slug"]}</loc><lastmod>{lastmod}</lastmod><priority>0.85</priority></url>')

    xml_lines.append('</urlset>')
    return Response("\n".join(xml_lines), mimetype="application/xml")

@seo_bp.route("/robots.txt", methods=["GET"])
def robots():
    content = """User-agent: *
Allow: /
Allow: /#store
Allow: /#product/
Disallow: /api/admin/
Disallow: /#admin

Sitemap: https://novadrop.io/sitemap.xml
"""
    return Response(content, mimetype="text/plain")

@seo_bp.route("/api/seo/product/<slug>", methods=["GET"])
def product_seo_metadata(slug):
    p = query_one("SELECT * FROM products WHERE slug = ? AND is_active = 1", (slug,))
    if not p:
        return jsonify({"error": "Product not found"}), 404

    try:
        images = json.loads(p["images_json"]) if p["images_json"] else []
    except Exception:
        images = []
    primary_img = images[0] if images else "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"

    structured_data = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": p["title"],
        "image": images,
        "description": p["short_description"] or p["title"],
        "sku": p["sku"],
        "offers": {
            "@type": "Offer",
            "url": f"https://novadrop.io/#product/{p['slug']}",
            "priceCurrency": "USD",
            "price": p["retail_price"],
            "availability": "https://schema.org/InStock" if p["stock_quantity"] > 0 else "https://schema.org/OutOfStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": p["rating_avg"],
            "reviewCount": p["rating_count"] or 1
        }
    }

    return jsonify({
        "title": f"{p['title']} — NovaDrop Direct",
        "meta_description": p["short_description"] or f"Buy {p['title']} with direct express shipping and 30-day returns.",
        "canonical_url": f"https://novadrop.io/#product/{p['slug']}",
        "og_title": p["title"],
        "og_image": primary_img,
        "og_type": "product",
        "schema_json_ld": structured_data
    })
