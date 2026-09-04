-- Complete Production-Ready Dropshipping Platform Schema
-- Optimized for SQLite with Foreign Keys and Indexes

PRAGMA foreign_keys = ON;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'merchant', 'supplier', 'staff', 'customer')),
    permissions_json TEXT NOT NULL DEFAULT '[]',
    phone TEXT,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Saved Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'Home',
    full_name TEXT NOT NULL,
    street_address TEXT NOT NULL,
    apt_suite TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'United States',
    phone TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Dropship Suppliers / Wholesalers
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    country TEXT NOT NULL,
    shipping_origin TEXT NOT NULL,
    rating REAL DEFAULT 4.8,
    fulfillment_sla_days INTEGER DEFAULT 2,
    return_policy TEXT,
    is_verified INTEGER DEFAULT 1,
    total_orders_fulfilled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    icon TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 5. Master Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    cost_price REAL NOT NULL, -- Supplier wholesale cost
    retail_price REAL NOT NULL, -- Dropshipper selling price
    compare_at_price REAL, -- MSRP / original price
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    weight_kg REAL DEFAULT 0.5,
    dimensions TEXT, -- "LxWxH cm"
    is_active INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    rating_avg REAL DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT, -- Comma-separated or JSON
    images_json TEXT NOT NULL DEFAULT '[]',
    attributes_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- 6. Product Variants (Sizes, Colors, Styles)
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    title TEXT NOT NULL, -- e.g. "Space Gray / 256GB" or "Large / Black"
    sku TEXT UNIQUE NOT NULL,
    cost_price REAL NOT NULL,
    retail_price REAL NOT NULL,
    compare_at_price REAL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    option1_name TEXT,
    option1_value TEXT,
    option2_name TEXT,
    option2_value TEXT,
    option3_name TEXT,
    option3_value TEXT,
    barcode TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. Pricing Markup Rules for Dropshippers
CREATE TABLE IF NOT EXISTS markup_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    markup_type TEXT NOT NULL CHECK(markup_type IN ('multiplier', 'percentage', 'fixed_amount')),
    markup_value REAL NOT NULL,
    rounding_format TEXT DEFAULT '99', -- '99', '95', 'exact'
    min_margin REAL DEFAULT 10.0,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Orders
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address_json TEXT NOT NULL,
    billing_address_json TEXT,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0.0,
    coupon_code TEXT,
    shipping_fee REAL DEFAULT 0.0,
    tax_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    payment_method TEXT DEFAULT 'card',
    payment_transaction_id TEXT,
    order_status TEXT NOT NULL DEFAULT 'pending' CHECK(order_status IN ('pending', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'disputed')),
    customer_notes TEXT,
    admin_notes TEXT,
    cancellation_reason TEXT,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Order Items (Lines with Supplier Routing)
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    supplier_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    variant_title TEXT,
    sku TEXT NOT NULL,
    unit_price REAL NOT NULL, -- Retail price customer paid
    cost_price REAL NOT NULL, -- Supplier wholesale price
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price REAL NOT NULL,
    fulfillment_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'routed', 'confirmed', 'shipped', 'delivered', 'refunded', 'cancelled')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- 10. Fulfillments & Shipping Dispatches (Per Supplier)
CREATE TABLE IF NOT EXISTS fulfillments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    fulfillment_number TEXT UNIQUE NOT NULL,
    tracking_number TEXT,
    carrier TEXT NOT NULL DEFAULT 'YunExpress', -- YunExpress, DHL, FedEx, USPS, 4PX, ePacket
    carrier_service TEXT DEFAULT 'Standard Express',
    tracking_url TEXT,
    status TEXT NOT NULL DEFAULT 'label_created' CHECK(status IN ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'failed')),
    shipped_at DATETIME,
    estimated_delivery_at DATETIME,
    delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- 11. Tracking Checkpoints & Milestones
CREATE TABLE IF NOT EXISTS tracking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fulfillment_id INTEGER NOT NULL,
    status_stage TEXT NOT NULL CHECK(status_stage IN ('order_placed', 'supplier_confirmed', 'label_created', 'departed_facility', 'in_transit', 'customs_cleared', 'out_for_delivery', 'delivered')),
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    checkpoint_time DATETIME NOT NULL,
    FOREIGN KEY (fulfillment_id) REFERENCES fulfillments(id) ON DELETE CASCADE
);

-- 12. Promotional Coupons & Discounts
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed_amount')),
    discount_value REAL NOT NULL,
    min_purchase_amount REAL DEFAULT 0.0,
    max_discount_amount REAL,
    usage_limit INTEGER DEFAULT 1000,
    times_used INTEGER DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Customer Product Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    title TEXT NOT NULL,
    comment TEXT NOT NULL,
    verified_purchase INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
    helpful_count INTEGER DEFAULT 0,
    admin_reply TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 14. Returns, Refunds & RMA Disputes
CREATE TABLE IF NOT EXISTS refund_disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    order_item_id INTEGER,
    user_id INTEGER,
    supplier_id INTEGER,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    requested_amount REAL NOT NULL,
    refund_amount REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'under_review', 'approved', 'rejected', 'refunded')),
    proof_images_json TEXT DEFAULT '[]',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 15. Customer Wishlist
CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 16. Store & Dropshipping Platform Settings
CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. Security & Admin Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON order_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_tracking ON fulfillments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_fulfillment ON tracking_events(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON refund_disputes(order_id);
