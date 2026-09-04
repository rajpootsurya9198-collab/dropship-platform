from flask import Blueprint, request, jsonify, g
from ..db import query_all, query_one, execute_write, get_db
from ..security import require_auth, log_audit

admin_settings_bp = Blueprint("admin_settings", __name__)

@admin_settings_bp.route("/settings", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_settings():
    if request.method == "GET":
        settings = query_all("SELECT * FROM store_settings ORDER BY group_name, key")
        settings_dict = {s["key"]: s["value"] for s in settings}
        return jsonify({"settings": settings, "settings_map": settings_dict})

    data = request.get_json() or {}
    updated_keys = []

    with get_db() as conn:
        cursor = conn.cursor()
        for k, v in data.items():
            cursor.execute(
                """INSERT INTO store_settings (key, value, updated_at)
                   VALUES (?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
                (k, str(v))
            )
            updated_keys.append(k)

    log_audit("SETTINGS_UPDATED", "store_settings", None, {"updated_keys": updated_keys})
    return jsonify({"message": "Settings updated successfully.", "updated_keys": updated_keys})

@admin_settings_bp.route("/markup-rules", methods=["GET", "POST"])
@require_auth(allowed_roles=["admin", "merchant"])
def handle_markup_rules():
    if request.method == "GET":
        rules = query_all("SELECT * FROM markup_rules ORDER BY id ASC")
        return jsonify({"rules": rules})

    data = request.get_json() or {}
    rule_name = data.get("rule_name", "").strip()
    markup_type = data.get("markup_type", "multiplier") # multiplier, percentage, fixed_amount
    markup_value = float(data.get("markup_value", 2.0))
    rounding_format = data.get("rounding_format", "99")
    min_margin = float(data.get("min_margin", 10.0))
    is_default = 1 if data.get("is_default") else 0

    if not rule_name:
        return jsonify({"error": "Rule name is required."}), 400

    if is_default:
        execute_write("UPDATE markup_rules SET is_default = 0")

    rule_id = execute_write(
        """INSERT INTO markup_rules (rule_name, markup_type, markup_value, rounding_format, min_margin, is_default)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (rule_name, markup_type, markup_value, rounding_format, min_margin, is_default)
    )

    log_audit("MARKUP_RULE_CREATED", "markup_rules", rule_id, {"rule_name": rule_name})
    return jsonify({"message": "Markup rule created.", "rule_id": rule_id}), 201

@admin_settings_bp.route("/markup-rules/<int:rule_id>", methods=["DELETE"])
@require_auth(allowed_roles=["admin", "merchant"])
def delete_markup_rule(rule_id):
    execute_write("DELETE FROM markup_rules WHERE id = ?", (rule_id,))
    log_audit("MARKUP_RULE_DELETED", "markup_rules", rule_id)
    return jsonify({"message": "Markup rule deleted."})
