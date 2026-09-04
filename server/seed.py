import json
from datetime import datetime, timedelta
from .db import init_db, execute_write, query_one, get_db
from .security import hash_password, ALL_PERMISSIONS
from .config import SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_STAFF_EMAIL, SEED_STAFF_PASSWORD

def seed_database():
    print("Initializing schema...")
    init_db(force_recreate=True)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Seed Users
        # NOTE: SEED ACCOUNTS ARE FOR DEVELOPMENT ONLY — MUST BE CHANGED/REMOVED IN PRODUCTION
        print("Seeding users (Development accounts)...")
        users = [
            (SEED_ADMIN_EMAIL, hash_password(SEED_ADMIN_PASSWORD), "Marcus Vance (Chief Admin)", "admin", json.dumps(ALL_PERMISSIONS), "+1 (555) 019-2834", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"),
            (SEED_STAFF_EMAIL, hash_password(SEED_STAFF_PASSWORD), "Jordan Lee (Operations Staff)", "staff", json.dumps(["ORDER_READ", "ORDER_WRITE", "PRODUCT_READ"]), "+1 (555) 018-7731", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"),
            ("merchant@novaretail.com", hash_password("Merchant123!"), "Elena Rostova (Dropship Merchant)", "merchant", json.dumps(["PRODUCT_READ", "PRODUCT_WRITE", "ORDER_READ", "ORDER_WRITE", "CUSTOMER_READ", "COUPON_WRITE", "ANALYTICS_READ", "SETTINGS_WRITE"]), "+1 (555) 014-9921", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"),
            ("supplier@apextech.com", hash_password("Supplier123!"), "Chen Wei (ApexTech Global)", "supplier", json.dumps(["PRODUCT_READ", "PRODUCT_WRITE", "ORDER_READ", "ORDER_WRITE"]), "+86 755 8829 1102", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"),
            ("supplier@nordic.eu", hash_password("Supplier123!"), "Astrid Lind (Nordic Living EU)", "supplier", json.dumps(["PRODUCT_READ", "PRODUCT_WRITE", "ORDER_READ", "ORDER_WRITE"]), "+31 10 491 8820", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"),
            ("customer@example.com", hash_password("Customer123!"), "Sophia Martinez", "customer", "[]", "+1 (555) 392-1084", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"),
        ]
        
        user_ids = {}
        for email, pwd, name, role, perms, phone, avatar in users:
            cursor.execute(
                "INSERT INTO users (email, password_hash, full_name, role, permissions_json, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (email, pwd, name, role, perms, phone, avatar)
            )
            user_ids[email] = cursor.lastrowid
            
        # 2. Seed Customer Addresses
        cursor.execute(
            """INSERT INTO addresses (user_id, title, full_name, street_address, apt_suite, city, state, postal_code, country, phone, is_default)
               VALUES (?, 'Home', 'Sophia Martinez', '742 Evergreen Terrace', 'Apt 4B', 'Austin', 'TX', '78701', 'United States', '+1 (555) 392-1084', 1)""",
            (user_ids["customer@example.com"],)
        )
        cursor.execute(
            """INSERT INTO addresses (user_id, title, full_name, street_address, apt_suite, city, state, postal_code, country, phone, is_default)
               VALUES (?, 'Work Office', 'Sophia Martinez', '100 Congress Ave', 'Floor 12', 'Austin', 'TX', '78701', 'United States', '+1 (555) 392-1084', 0)""",
            (user_ids["customer@example.com"],)
        )
        
        # 3. Seed Suppliers
        print("Seeding suppliers...")
        suppliers = [
            (user_ids["supplier@apextech.com"], "ApexTech Global Supply", "SUP-APEX-01", "Chen Wei", "supplier@apextech.com", "+86 755 8829 1102", "China", "Shenzhen Warehouse #4, Guangdong", 4.9, 1, "30-day DOA replacement with instant photo verification", 1, 1420),
            (user_ids["supplier@nordic.eu"], "Nordic Living Distribution EU", "SUP-NORDIC-02", "Astrid Lind", "supplier@nordic.eu", "+31 10 491 8820", "Netherlands", "Rotterdam Port Logistics Hub B", 4.8, 1, "Free returns within 45 days inside EU & US", 1, 890),
            (None, "AeroFit Performance USA", "SUP-AEROFIT-03", "James Vance", "fulfillment@aerofit.com", "+1 310 992 4811", "United States", "Ontario Fulfillment Center, California", 4.9, 1, "Hassle-free 60-day return policy", 1, 2150),
            (None, "LuxeAura Beauty Labs", "SUP-LUXE-04", "Min-ji Park", "orders@luxeaura.kr", "+82 2 8192 3310", "South Korea", "Incheon Free Trade Zone Depot", 4.7, 2, "Sealed product return guarantee", 1, 640),
        ]
        
        supplier_ids = {}
        for u_id, name, code, contact, email, phone, country, origin, rating, sla, policy, verified, fulfilled in suppliers:
            cursor.execute(
                """INSERT INTO suppliers (user_id, name, code, contact_name, email, phone, country, shipping_origin, rating, fulfillment_sla_days, return_policy, is_verified, total_orders_fulfilled)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (u_id, name, code, contact, email, phone, country, origin, rating, sla, policy, verified, fulfilled)
            )
            supplier_ids[code] = cursor.lastrowid
            
        # 4. Seed Categories
        print("Seeding categories...")
        categories = [
            ("Tech & Smart Gadgets", "tech-gadgets", "Cutting-edge electronics, audio, smart wearables and accessories", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", "cpu", 1),
            ("Home & Smart Living", "home-living", "Modern aesthetic decor, ambient lighting, and intelligent home utilities", "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500", "home", 2),
            ("Fitness & Active Life", "fitness-outdoors", "Pro-grade recovery gear, insulated titanium hydration, and workout essentials", "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500", "activity", 3),
            ("Beauty & Personal Care", "beauty-care", "Sonic facial cleansers, red light therapy, and premium grooming tools", "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500", "sparkles", 4),
            ("Ergonomic Workspace", "ergonomic-workspace", "Desk mats, mechanical accessories, cable organizers, and monitor arms", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500", "monitor", 5),
            ("Everyday Carry & Travel", "edc-travel", "RFID minimalist wallets, magnetic power banks, and titanium multi-tools", "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500", "briefcase", 6),
        ]
        
        category_ids = {}
        for name, slug, desc, img, icon, sort_order in categories:
            cursor.execute(
                "INSERT INTO categories (name, slug, description, image_url, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                (name, slug, desc, img, icon, sort_order)
            )
            category_ids[slug] = cursor.lastrowid
            
        # 5. Seed Products & Variants
        print("Seeding products & variants...")
        products_data = [
            {
                "title": "AuraSound Pro Hybrid Active Noise-Cancelling Headphones",
                "slug": "aurasound-pro-anc-headphones",
                "category": "tech-gadgets",
                "supplier": "SUP-APEX-01",
                "cost_price": 28.50,
                "retail_price": 79.99,
                "compare_at_price": 129.99,
                "sku": "AUR-ANC-PRO",
                "stock": 185,
                "rating_avg": 4.9,
                "rating_count": 48,
                "is_featured": 1,
                "weight_kg": 0.42,
                "tags": "Audio, Bluetooth 5.4, ANC, Travel, Best Seller",
                "short_desc": "Industry-leading 45dB hybrid ANC with 65-hour battery life and spatial audio immersion.",
                "desc": "<p>Experience studio-grade acoustic clarity with the <strong>AuraSound Pro</strong>. Engineered with 40mm bio-cellulose dynamic drivers, adaptive hybrid noise cancellation, and ultra-plush protein memory foam earcups.</p><ul><li>Up to 45dB active noise reduction with transparency mode</li><li>65 hours playtime with USB-C quick charge (5 min = 4 hours)</li><li>Multipoint Bluetooth 5.4 pairing for seamless phone & laptop switching</li><li>Built-in quad beamforming microphones for crystal-clear calls</li></ul>",
                "images": [
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
                    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800",
                    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800"
                ],
                "variants": [
                    {"title": "Midnight Black", "sku": "AUR-ANC-BLK", "cost": 28.50, "price": 79.99, "stock": 80, "opt1_name": "Color", "opt1_val": "Midnight Black"},
                    {"title": "Lunar Silver", "sku": "AUR-ANC-SLV", "cost": 28.50, "price": 79.99, "stock": 65, "opt1_name": "Color", "opt1_val": "Lunar Silver"},
                    {"title": "Midnight Navy", "sku": "AUR-ANC-NVY", "cost": 29.00, "price": 84.99, "stock": 40, "opt1_name": "Color", "opt1_val": "Midnight Navy"}
                ]
            },
            {
                "title": "Lumina Ambient Smart LED Gradient Lightbar",
                "slug": "lumina-smart-led-gradient-lightbar",
                "category": "home-living",
                "supplier": "SUP-APEX-01",
                "cost_price": 14.20,
                "retail_price": 44.99,
                "compare_at_price": 69.99,
                "sku": "LUM-BAR-01",
                "stock": 240,
                "rating_avg": 4.8,
                "rating_count": 36,
                "is_featured": 1,
                "weight_kg": 0.35,
                "tags": "Lighting, Smart Home, Desk Setup, RGBIC",
                "short_desc": "RGBIC segmented color streaming with dynamic audio music sync and app control.",
                "desc": "<p>Transform your desk setup or living space with the <strong>Lumina Smart Lightbar</strong>. Features 16 million colors, dual vertical/horizontal mounting, and real-time audio synchronization.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800",
                    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800"
                ],
                "variants": [
                    {"title": "Single Bar (30cm)", "sku": "LUM-BAR-SGL", "cost": 14.20, "price": 44.99, "stock": 140, "opt1_name": "Pack", "opt1_val": "1-Pack"},
                    {"title": "Dual Sync Kit (2-Pack)", "sku": "LUM-BAR-DBL", "cost": 24.50, "price": 74.99, "stock": 100, "opt1_name": "Pack", "opt1_val": "2-Pack Dual Sync"}
                ]
            },
            {
                "title": "Nordic Minimalist Ultrasonic Aromatherapy Diffuser",
                "slug": "nordic-ultrasonic-aromatherapy-diffuser",
                "category": "home-living",
                "supplier": "SUP-NORDIC-02",
                "cost_price": 18.00,
                "retail_price": 49.99,
                "compare_at_price": 79.99,
                "sku": "NOR-DIF-02",
                "stock": 115,
                "rating_avg": 4.9,
                "rating_count": 29,
                "is_featured": 1,
                "weight_kg": 0.65,
                "tags": "Wellness, Home Decor, Scandinavian, Aromatherapy",
                "short_desc": "Handcrafted matte ceramic exterior with whisper-quiet ultrasonic mist and warm ambient glow.",
                "desc": "<p>Crafted with premium porcelain stoneware and genuine solid wood accents. Automatically shuts off when empty.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800",
                    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800"
                ],
                "variants": [
                    {"title": "Sandstone Beige", "sku": "NOR-DIF-SND", "cost": 18.00, "price": 49.99, "stock": 65, "opt1_name": "Color", "opt1_val": "Sandstone Beige"},
                    {"title": "Terracotta Clay", "sku": "NOR-DIF-TER", "cost": 18.00, "price": 49.99, "stock": 50, "opt1_name": "Color", "opt1_val": "Terracotta Clay"}
                ]
            },
            {
                "title": "TitanHydrate Pure Vacuum Titanium Water Bottle (750ml)",
                "slug": "titanhydrate-pure-titanium-water-bottle",
                "category": "fitness-outdoors",
                "supplier": "SUP-AEROFIT-03",
                "cost_price": 22.00,
                "retail_price": 59.99,
                "compare_at_price": 95.00,
                "sku": "TITAN-BOT-750",
                "stock": 190,
                "rating_avg": 5.0,
                "rating_count": 52,
                "is_featured": 1,
                "weight_kg": 0.28,
                "tags": "Hydration, Titanium, Ultralight, Fitness, BPA Free",
                "short_desc": "Grade-1 Medical Titanium double-wall insulation keeps drinks ice cold 24h or piping hot 12h.",
                "desc": "<p>Ultralight, zero metallic taste, and indestructible. Pure biocompatible titanium construction.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
                    "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"
                ],
                "variants": [
                    {"title": "Brushed Raw Titanium", "sku": "TITAN-RAW-750", "cost": 22.00, "price": 59.99, "stock": 110, "opt1_name": "Finish", "opt1_val": "Raw Titanium"},
                    {"title": "Obsidian Matte Black", "sku": "TITAN-OBS-750", "cost": 23.50, "price": 64.99, "stock": 80, "opt1_name": "Finish", "opt1_val": "Obsidian Black"}
                ]
            },
            {
                "title": "AeroPulse Deep Tissue Mini Massage Gun 4.0",
                "slug": "aeropulse-deep-tissue-mini-massage-gun",
                "category": "fitness-outdoors",
                "supplier": "SUP-AEROFIT-03",
                "cost_price": 26.00,
                "retail_price": 74.99,
                "compare_at_price": 119.99,
                "sku": "AERO-PULSE-MN4",
                "stock": 95,
                "rating_avg": 4.8,
                "rating_count": 41,
                "is_featured": 1,
                "weight_kg": 0.52,
                "tags": "Recovery, Fitness, Massage, Percussion Therapy",
                "short_desc": "Pocket-sized 3200 RPM brushless motor delivering 12mm deep muscle amplitude.",
                "desc": "<p>Powerful enough for athletic recovery, compact enough for your gym bag. Aerospace aluminum casing.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800",
                    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800"
                ],
                "variants": [
                    {"title": "Space Gray / 4 Head Kit", "sku": "AERO-PLS-GRY", "cost": 26.00, "price": 74.99, "stock": 60, "opt1_name": "Color", "opt1_val": "Space Gray"},
                    {"title": "Crimson Red / 4 Head Kit", "sku": "AERO-PLS-RED", "cost": 26.00, "price": 74.99, "stock": 35, "opt1_name": "Color", "opt1_val": "Crimson Red"}
                ]
            },
            {
                "title": "LuxeGlow 7-in-1 LED Photon Facial Therapy Mask",
                "slug": "luxeglow-7-in-1-led-facial-mask",
                "category": "beauty-care",
                "supplier": "SUP-LUXE-04",
                "cost_price": 35.00,
                "retail_price": 99.99,
                "compare_at_price": 189.00,
                "sku": "LUXE-LED-701",
                "stock": 80,
                "rating_avg": 4.9,
                "rating_count": 64,
                "is_featured": 1,
                "weight_kg": 0.45,
                "tags": "Skincare, LED Therapy, Anti-Aging, Beauty Tech",
                "short_desc": "Clinical-grade red, blue, amber, and near-infrared phototherapy for collagen production & skin rejuvenation.",
                "desc": "<p>Experience spa-grade phototherapy at home. Features 192 high-density LED diodes with flexible medical silicone.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
                    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800"
                ],
                "variants": [
                    {"title": "Standard Platinum Mask", "sku": "LUXE-LED-PLT", "cost": 35.00, "price": 99.99, "stock": 50, "opt1_name": "Edition", "opt1_val": "Platinum Edition"},
                    {"title": "Pro Wireless Neck & Face Kit", "sku": "LUXE-LED-PRO", "cost": 48.00, "price": 139.99, "stock": 30, "opt1_name": "Edition", "opt1_val": "Pro Face & Neck"}
                ]
            },
            {
                "title": "ErgoDesk Premium Merino Wool Felt Desk Mat",
                "slug": "ergodesk-merino-wool-desk-mat",
                "category": "ergonomic-workspace",
                "supplier": "SUP-NORDIC-02",
                "cost_price": 11.50,
                "retail_price": 34.99,
                "compare_at_price": 54.99,
                "sku": "ERGO-MAT-WOL",
                "stock": 310,
                "rating_avg": 4.8,
                "rating_count": 22,
                "is_featured": 0,
                "weight_kg": 0.32,
                "tags": "Desk Mat, Office, Minimalist, Workspace, Wool",
                "short_desc": "Genuine German merino wool with anti-slip natural cork backing and water-repellent coating.",
                "desc": "<p>Protect your desktop while giving your workstation an elevated Scandinavian feel.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
                    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800"
                ],
                "variants": [
                    {"title": "Medium (80x30cm) - Charcoal", "sku": "ERGO-MAT-M-CHR", "cost": 11.50, "price": 34.99, "stock": 160, "opt1_name": "Size", "opt1_val": "Medium (80x30cm)"},
                    {"title": "Large (90x40cm) - Charcoal", "sku": "ERGO-MAT-L-CHR", "cost": 14.50, "price": 42.99, "stock": 150, "opt1_name": "Size", "opt1_val": "Large (90x40cm)"}
                ]
            },
            {
                "title": "Vanguard Slim RFID Titanium Cardholder Wallet",
                "slug": "vanguard-slim-rfid-titanium-cardholder",
                "category": "edc-travel",
                "supplier": "SUP-APEX-01",
                "cost_price": 9.80,
                "retail_price": 29.99,
                "compare_at_price": 49.99,
                "sku": "VAN-WAL-01",
                "stock": 420,
                "rating_avg": 4.9,
                "rating_count": 87,
                "is_featured": 1,
                "weight_kg": 0.08,
                "tags": "EDC, Wallet, RFID Blocking, Titanium, Slim",
                "short_desc": "Ultra-slim 6mm profile holding up to 12 cards and cash with quick-eject thumb trigger.",
                "desc": "<p>Military-grade RFID blocking plates crafted from anodized aircraft aluminum and Grade 5 titanium.</p>",
                "images": [
                    "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800",
                    "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800"
                ],
                "variants": [
                    {"title": "Gunmetal Gray", "sku": "VAN-WAL-GUN", "cost": 9.80, "price": 29.99, "stock": 200, "opt1_name": "Color", "opt1_val": "Gunmetal Gray"},
                    {"title": "Forged Carbon Fiber", "sku": "VAN-WAL-CRB", "cost": 12.00, "price": 36.99, "stock": 150, "opt1_name": "Color", "opt1_val": "Forged Carbon Fiber"},
                    {"title": "Burnt Titanium Anodized", "sku": "VAN-WAL-BRN", "cost": 13.50, "price": 39.99, "stock": 70, "opt1_name": "Color", "opt1_val": "Burnt Titanium"}
                ]
            }
        ]
        
        product_ids = {}
        for p in products_data:
            cursor.execute(
                """INSERT INTO products (
                    supplier_id, category_id, title, slug, description, short_description,
                    cost_price, retail_price, compare_at_price, sku, stock_quantity,
                    low_stock_threshold, weight_kg, is_active, is_featured, rating_avg,
                    rating_count, tags, images_json, attributes_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?, 1, ?, ?, ?, ?, ?, '{}')""",
                (
                    supplier_ids[p["supplier"]],
                    category_ids[p["category"]],
                    p["title"],
                    p["slug"],
                    p["desc"],
                    p["short_desc"],
                    p["cost_price"],
                    p["retail_price"],
                    p["compare_at_price"],
                    p["sku"],
                    p["stock"],
                    p["weight_kg"],
                    p["is_featured"],
                    p["rating_avg"],
                    p["rating_count"],
                    p["tags"],
                    json.dumps(p["images"])
                )
            )
            prod_id = cursor.lastrowid
            product_ids[p["slug"]] = prod_id
            
            for v in p["variants"]:
                cursor.execute(
                    """INSERT INTO product_variants (
                        product_id, title, sku, cost_price, retail_price, stock_quantity,
                        option1_name, option1_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        prod_id,
                        v["title"],
                        v["sku"],
                        v["cost"],
                        v["price"],
                        v["stock"],
                        v.get("opt1_name"),
                        v.get("opt1_val")
                    )
                )

        # 6. Seed Markup Rules
        print("Seeding markup rules...")
        cursor.execute(
            """INSERT INTO markup_rules (rule_name, markup_type, markup_value, rounding_format, min_margin, is_default)
               VALUES ('Standard 2.5x Markup (.99)', 'multiplier', 2.5, '99', 15.0, 1)"""
        )
        cursor.execute(
            """INSERT INTO markup_rules (rule_name, markup_type, markup_value, rounding_format, min_margin, is_default)
               VALUES ('High Margin 40% Tier', 'percentage', 40.0, '99', 20.0, 0)"""
        )
        cursor.execute(
            """INSERT INTO markup_rules (rule_name, markup_type, markup_value, rounding_format, min_margin, is_default)
               VALUES ('Flat $25 Markup', 'fixed_amount', 25.0, '95', 10.0, 0)"""
        )

        # 7. Seed Active Coupons
        print("Seeding coupons...")
        coupons = [
            ("WELCOME10", "10% off entire order for new shoppers", "percentage", 10.0, 0.0, 50.0, 500, 42, 1),
            ("DROPSHIP20", "20% off high-value orders over $80", "percentage", 20.0, 80.0, 100.0, 200, 19, 1),
            ("FREESHIP", "Free standard shipping discount ($4.99 off)", "fixed_amount", 4.99, 25.0, 4.99, 1000, 88, 1),
            ("VIP50", "Exclusive $50 off premium orders over $200", "fixed_amount", 50.0, 200.0, 50.0, 50, 6, 1),
        ]
        for code, desc, disc_type, val, min_amt, max_disc, limit_cnt, used, active in coupons:
            cursor.execute(
                """INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, times_used, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (code, desc, disc_type, val, min_amt, max_disc, limit_cnt, used, active)
            )

        # 8. Seed Store Settings
        print("Seeding store settings...")
        settings = [
            ("store_name", "NovaDrop Lifestyle & Tech", "general", "Public store brand name"),
            ("support_email", "support@novadrop.io", "general", "Customer care support email"),
            ("currency", "USD", "general", "Store base currency"),
            ("free_shipping_threshold", "50.00", "shipping", "Cart minimum for free standard delivery"),
            ("standard_shipping_fee", "4.99", "shipping", "Default standard express fee"),
            ("express_shipping_fee", "14.99", "shipping", "Fast priority courier delivery fee"),
            ("tax_rate_percent", "8.0", "financials", "Estimated sales tax percentage"),
            ("auto_route_orders", "true", "fulfillment", "Auto-dispatch items to designated supplier upon paid order"),
            ("supplier_sla_alert_days", "2", "fulfillment", "Alert threshold if supplier fails to upload tracking in N days")
        ]
        for key, val, group, desc in settings:
            cursor.execute(
                "INSERT INTO store_settings (key, value, group_name, description) VALUES (?, ?, ?, ?)",
                (key, val, group, desc)
            )

        # 9. Seed Sample Orders with Multi-Carrier Tracking & Fulfillments
        print("Seeding sample orders, fulfillments, and tracking events...")
        now = datetime.now()
        
        # Order 1: Delivered
        addr_json = json.dumps({
            "full_name": "Sophia Martinez",
            "street_address": "742 Evergreen Terrace",
            "apt_suite": "Apt 4B",
            "city": "Austin",
            "state": "TX",
            "postal_code": "78701",
            "country": "United States",
            "phone": "+1 (555) 392-1084"
        })
        
        cursor.execute(
            """INSERT INTO orders (
                order_number, user_id, customer_email, customer_name, customer_phone,
                shipping_address_json, subtotal, discount_amount, coupon_code, shipping_fee,
                tax_amount, total_amount, currency, payment_status, payment_method,
                payment_transaction_id, order_status, created_at
            ) VALUES ('ORD-88201', ?, 'customer@example.com', 'Sophia Martinez', '+1 (555) 392-1084',
                ?, 79.99, 8.00, 'WELCOME10', 0.00, 5.76, 77.75, 'USD', 'paid', 'card', 'tx_card_live_9921', 'delivered', ?)""",
            (user_ids["customer@example.com"], addr_json, (now - timedelta(days=6)).strftime("%Y-%m-%d %H:%M:%S"))
        )
        ord1_id = cursor.lastrowid
        
        # Items for Order 1
        cursor.execute(
            """INSERT INTO order_items (order_id, product_id, variant_id, supplier_id, title, variant_title, sku, unit_price, cost_price, quantity, total_price, status)
               VALUES (?, ?, ?, ?, 'AuraSound Pro Hybrid Active Noise-Cancelling Headphones', 'Midnight Black', 'AUR-ANC-BLK', 79.99, 28.50, 1, 79.99, 'delivered')""",
            (ord1_id, product_ids["aurasound-pro-anc-headphones"], 1, supplier_ids["SUP-APEX-01"])
        )
        
        # Fulfillment for Order 1
        cursor.execute(
            """INSERT INTO fulfillments (order_id, supplier_id, fulfillment_number, tracking_number, carrier, carrier_service, tracking_url, status, shipped_at, delivered_at, created_at)
               VALUES (?, ?, 'FUL-88201-1', 'YUN-882910482US', 'YunExpress', 'YunExpress Priority Line', 'https://track.yunexpress.com?num=YUN-882910482US', 'delivered', ?, ?, ?)""",
            (ord1_id, supplier_ids["SUP-APEX-01"], (now - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"), (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), (now - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"))
        )
        ful1_id = cursor.lastrowid
        
        tracking_milestones_1 = [
            ("order_placed", "Platform Checkout", "Order placed and payment successfully captured", (now - timedelta(days=6))),
            ("supplier_confirmed", "Shenzhen Warehouse #4, China", "Supplier Chen Wei accepted fulfillment and assigned package SKU", (now - timedelta(days=5, hours=18))),
            ("label_created", "YunExpress Shenzhen Hub", "Electronic shipping label generated & tracking number assigned", (now - timedelta(days=5, hours=12))),
            ("departed_facility", "Shenzhen Bao'an Airport", "Dispatched on international cargo flight to Destination Airport (DFW)", (now - timedelta(days=4))),
            ("customs_cleared", "Dallas Fort Worth Customs Hub, TX", "Inbound customs cleared. Handed over to local delivery partner (USPS)", (now - timedelta(days=2))),
            ("out_for_delivery", "Austin Local Sorting Depot, TX", "Out for final doorstep delivery with USPS Courier", (now - timedelta(days=1, hours=4))),
            ("delivered", "Austin, TX (Front Porch)", "Package delivered successfully. Signed by Resident.", (now - timedelta(days=1)))
        ]
        for stage, loc, desc, ts in tracking_milestones_1:
            cursor.execute(
                "INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time) VALUES (?, ?, ?, ?, ?)",
                (ful1_id, stage, loc, desc, ts.strftime("%Y-%m-%d %H:%M:%S"))
            )

        # Order 2: In Transit (Shipped)
        cursor.execute(
            """INSERT INTO orders (
                order_number, user_id, customer_email, customer_name, customer_phone,
                shipping_address_json, subtotal, discount_amount, coupon_code, shipping_fee,
                tax_amount, total_amount, currency, payment_status, payment_method,
                payment_transaction_id, order_status, created_at
            ) VALUES ('ORD-88202', ?, 'customer@example.com', 'Sophia Martinez', '+1 (555) 392-1084',
                ?, 104.98, 0.00, NULL, 0.00, 8.40, 113.38, 'USD', 'paid', 'card', 'tx_card_live_9922', 'shipped', ?)""",
            (user_ids["customer@example.com"], addr_json, (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"))
        )
        ord2_id = cursor.lastrowid
        
        cursor.execute(
            """INSERT INTO order_items (order_id, product_id, variant_id, supplier_id, title, variant_title, sku, unit_price, cost_price, quantity, total_price, status)
               VALUES (?, ?, ?, ?, 'Nordic Minimalist Ultrasonic Aromatherapy Diffuser', 'Sandstone Beige', 'NOR-DIF-SND', 49.99, 18.00, 1, 49.99, 'shipped')""",
            (ord2_id, product_ids["nordic-ultrasonic-aromatherapy-diffuser"], 6, supplier_ids["SUP-NORDIC-02"])
        )
        cursor.execute(
            """INSERT INTO order_items (order_id, product_id, variant_id, supplier_id, title, variant_title, sku, unit_price, cost_price, quantity, total_price, status)
               VALUES (?, ?, ?, ?, 'TitanHydrate Pure Vacuum Titanium Water Bottle', 'Brushed Raw Titanium', 'TITAN-RAW-750', 54.99, 22.00, 1, 54.99, 'shipped')""",
            (ord2_id, product_ids["titanhydrate-pure-titanium-water-bottle"], 8, supplier_ids["SUP-AEROFIT-03"])
        )
        
        # Order 2 has 2 Fulfillments (Split Order from 2 Suppliers!)
        cursor.execute(
            """INSERT INTO fulfillments (order_id, supplier_id, fulfillment_number, tracking_number, carrier, carrier_service, tracking_url, status, shipped_at, estimated_delivery_at, created_at)
               VALUES (?, ?, 'FUL-88202-A', 'DHL-994817263NL', 'DHL', 'DHL Global Express', 'https://dhl.com?num=DHL-994817263NL', 'in_transit', ?, ?, ?)""",
            (ord2_id, supplier_ids["SUP-NORDIC-02"], (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"), (now + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"), (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"))
        )
        ful2_id = cursor.lastrowid
        
        tracking_milestones_2 = [
            ("order_placed", "Platform Checkout", "Order placed and payment authorized", (now - timedelta(days=3))),
            ("supplier_confirmed", "Rotterdam Port Hub, Netherlands", "Supplier Astrid Lind confirmed stock allocation", (now - timedelta(days=2, hours=14))),
            ("label_created", "DHL Express Rotterdam", "Air Waybill DHL-994817263NL prepared", (now - timedelta(days=2, hours=8))),
            ("departed_facility", "Amsterdam Schiphol Airport", "Departed outbound international sorting hub", (now - timedelta(days=1, hours=12))),
            ("in_transit", "New York JFK Airport Hub", "Arrived at destination customs facility for import inspection", (now - timedelta(hours=6)))
        ]
        for stage, loc, desc, ts in tracking_milestones_2:
            cursor.execute(
                "INSERT INTO tracking_events (fulfillment_id, status_stage, location, description, checkpoint_time) VALUES (?, ?, ?, ?, ?)",
                (ful2_id, stage, loc, desc, ts.strftime("%Y-%m-%d %H:%M:%S"))
            )
            
        # Order 3: Processing
        cursor.execute(
            """INSERT INTO orders (
                order_number, user_id, customer_email, customer_name, customer_phone,
                shipping_address_json, subtotal, discount_amount, coupon_code, shipping_fee,
                tax_amount, total_amount, currency, payment_status, payment_method,
                payment_transaction_id, order_status, created_at
            ) VALUES ('ORD-88203', ?, 'customer@example.com', 'Sophia Martinez', '+1 (555) 392-1084',
                ?, 74.99, 0.00, NULL, 0.00, 6.00, 80.99, 'USD', 'paid', 'card', 'tx_card_live_9923', 'processing', ?)""",
            (user_ids["customer@example.com"], addr_json, (now - timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S"))
        )
        ord3_id = cursor.lastrowid
        cursor.execute(
            """INSERT INTO order_items (order_id, product_id, variant_id, supplier_id, title, variant_title, sku, unit_price, cost_price, quantity, total_price, status)
               VALUES (?, ?, ?, ?, 'AeroPulse Deep Tissue Mini Massage Gun 4.0', 'Space Gray', 'AERO-PLS-GRY', 74.99, 26.00, 1, 74.99, 'routed')""",
            (ord3_id, product_ids["aeropulse-deep-tissue-mini-massage-gun"], 10, supplier_ids["SUP-AEROFIT-03"])
        )

        # 10. Seed Customer Reviews
        print("Seeding reviews...")
        reviews_data = [
            (product_ids["aurasound-pro-anc-headphones"], user_ids["customer@example.com"], "Sophia Martinez", "customer@example.com", 5, "Unbelievable Sound Quality & Battery!", "I took these on a 14-hour cross-continental flight and the noise cancelling was flawless. The build quality feels like a $300 set.", 1, "approved", 14),
            (product_ids["aurasound-pro-anc-headphones"], None, "David K.", "david.k@gmail.com", 5, "Best headphones for dropshipping store", "Fast shipping with YunExpress (arrived in 7 days to California). Packaged very well with premium unboxing.", 1, "approved", 8),
            (product_ids["lumina-smart-led-gradient-lightbar"], None, "Liam N.", "liam.n@yahoo.com", 5, "Elevated my desk setup completely", "The music sync mode is so responsive! Setup with the app took less than 2 minutes.", 1, "approved", 5),
            (product_ids["titanhydrate-pure-titanium-water-bottle"], user_ids["customer@example.com"], "Sophia Martinez", "customer@example.com", 5, "Ultralight and zero metallic aftertaste", "Remarkable craftsmanship. You can instantly feel the featherweight titanium.", 1, "approved", 9),
            (product_ids["vanguard-slim-rfid-titanium-cardholder"], None, "Alexander P.", "alex.p@outlook.com", 5, "Replaced my bulky leather wallet", "Holds 8 cards effortlessly. The eject mechanism is super satisfying to click.", 1, "approved", 12)
        ]
        for p_id, u_id, name, email, rating, title, comm, ver, stat, help_cnt in reviews_data:
            cursor.execute(
                """INSERT INTO reviews (product_id, user_id, user_name, user_email, rating, title, comment, verified_purchase, status, helpful_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (p_id, u_id, name, email, rating, title, comm, ver, stat, help_cnt)
            )

        # 11. Seed Sample Refund / Dispute
        print("Seeding refund disputes...")
        cursor.execute(
            """INSERT INTO refund_disputes (order_id, order_item_id, user_id, supplier_id, reason, details, requested_amount, status, proof_images_json)
               VALUES (?, 1, ?, ?, 'Damaged during international transit', 'The retail box corner was crushed on arrival. Requesting a partial refund for gift repackaging.', 15.00, 'under_review', '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300"]')""",
            (ord1_id, user_ids["customer@example.com"], supplier_ids["SUP-APEX-01"])
        )
        
    print("Database successfully seeded with realistic enterprise dropshipping data!")

if __name__ == "__main__":
    seed_database()
