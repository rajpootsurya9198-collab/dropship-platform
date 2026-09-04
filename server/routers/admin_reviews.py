from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write
from ..security import require_auth, log_audit

admin_reviews_bp = Blueprint("admin_reviews", __name__)

@admin_reviews_bp.route("/reviews", methods=["GET"])
@require_auth(allowed_roles=["admin", "merchant"])
def list_all_reviews():
    status = request.args.get("status", "").strip()
    where_clauses = ["1=1"]
    params = []

    if status:
        where_clauses.append("r.status = ?")
        params.append(status)

    where_sql = " AND ".join(where_clauses)
    sql = f"""
        SELECT r.*, p.title as product_title, p.slug as product_slug, p.images_json
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE {where_sql}
        ORDER BY r.created_at DESC
    """
    reviews = query_all(sql, params)
    return jsonify({"reviews": reviews})

@admin_reviews_bp.route("/reviews/<int:review_id>/status", methods=["PUT"])
@require_auth(allowed_roles=["admin", "merchant"])
def update_review_status(review_id):
    rev = query_one("SELECT * FROM reviews WHERE id = ?", (review_id,))
    if not rev:
        return jsonify({"error": "Review not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "approved").strip().lower()
    if new_status not in ["pending", "approved", "rejected"]:
        return jsonify({"error": "Status must be pending, approved, or rejected."}), 400

    execute_write("UPDATE reviews SET status = ? WHERE id = ?", (new_status, review_id))

    # Recalculate product rating stats
    rating_stats = query_one(
        "SELECT AVG(rating) as avg_rating, COUNT(id) as count FROM reviews WHERE product_id = ? AND status = 'approved'",
        (rev["product_id"],)
    )
    if rating_stats:
        new_avg = round(rating_stats["avg_rating"] or 5.0, 1)
        new_count = rating_stats["count"]
        execute_write(
            "UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?",
            (new_avg, new_count, rev["product_id"])
        )

    log_audit("REVIEW_STATUS_UPDATED", "reviews", review_id, {"status": new_status})
    return jsonify({"message": f"Review {new_status}.", "status": new_status})

@admin_reviews_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
@require_auth(allowed_roles=["admin", "merchant"])
def delete_review(review_id):
    rev = query_one("SELECT * FROM reviews WHERE id = ?", (review_id,))
    if not rev:
        return jsonify({"error": "Review not found."}), 404

    execute_write("DELETE FROM reviews WHERE id = ?", (review_id,))
    log_audit("REVIEW_DELETED", "reviews", review_id)
    return jsonify({"message": "Review deleted."})

@admin_reviews_bp.route("/reviews/<int:review_id>/reply", methods=["POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def reply_to_review(review_id):
    data = request.get_json() or {}
    reply = data.get("reply", "").strip()
    execute_write("UPDATE reviews SET admin_reply = ? WHERE id = ?", (reply, review_id))
    return jsonify({"message": "Reply saved."})
