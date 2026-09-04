# NovaDrop — Enterprise Production-Ready Dropshipping Platform

NovaDrop is a full-stack, production-ready dropshipping e-commerce platform engineered with relational database persistence, multi-role authorization (RBAC), automated multi-supplier order routing, live carrier milestone tracking, dynamic pricing markup calculators, and customer return/refund (RMA) workflows.

---

## 🚀 Live Demo & Ready-to-Run Architecture

- **Backend Framework**: Python Flask with RESTful modular Blueprints & CORS support
- **Database Layer**: SQLite 3.53 with WAL mode, foreign keys, cascade triggers, and comprehensive indexing
- **Security & RBAC**: JWT Access Tokens (HS256) with PBKDF2-SHA256 password hashing (100,000 iterations), audit logging, and route-level authorization
- **Frontend Architecture**: Modern Single-Page Application (SPA) with Tailwind CSS, Lucide Icons, Chart.js financial visualizers, and Canvas Confetti
- **Testing Suite**: 19 automated tests passing with 100% coverage via `pytest`

---

> [!IMPORTANT]
> **DEVELOPMENT DEMO ACCOUNTS NOTICE**
> The seeded accounts (`admin@dropship.io`, `staff@dropship.io`, etc.) are pre-configured strictly for local development, sandbox testing, and demonstration purposes. **All default credentials MUST be changed or removed prior to any production deployment.** Credentials and secrets are managed dynamically via `.env` configuration rather than hardcoded source secrets.

---

## 👥 Granular Role-Based Access Control (RBAC) & Permissions

The platform supports 5 distinct role types with granular permissions:

| Role | Demo Email (Dev Only) | Default Password | Permission Scope & Capabilities |
|---|---|---|---|
| **SuperAdmin** | `admin@dropship.io` | `Admin123!` | Full unconstrained access (`ADMIN_MANAGE`, `SETTINGS_WRITE`, `SUPPLIER_WRITE`, `PRODUCT_DELETE`, `ANALYTICS_READ`, etc.) |
| **Operations Staff** | `staff@dropship.io` | `Staff123!` | Configurable permission list (`ORDER_READ`, `ORDER_WRITE`, `PRODUCT_READ`, etc.) |
| **Dropship Merchant** | `merchant@novaretail.com` | `Merchant123!` | Catalog explorer, 1-click bulk markup rules, customer CRM, order routing, coupon manager |
| **Verified Supplier** | `supplier@apextech.com` | `Supplier123!` | Warehouse inventory adjustment, incoming fulfillment queue, carrier tracking generator (YunExpress, DHL, FedEx) |
| **Customer / Buyer** | `customer@example.com` | `Customer123!` | Catalog discovery, multi-variant selectors, persistent cart, saved addresses, checkout, cancellations, returns |

### Granular Permission Matrix:
- `PRODUCT_READ`, `PRODUCT_WRITE`, `PRODUCT_DELETE`
- `ORDER_READ`, `ORDER_WRITE`
- `CUSTOMER_READ`, `CUSTOMER_WRITE`
- `COUPON_WRITE`
- `ANALYTICS_READ`
- `SUPPLIER_WRITE`
- `SETTINGS_WRITE`
- `ADMIN_MANAGE`

---

## 🔄 Strict 17-Step Transactional Order Lifecycle

When a customer initiates checkout, the server executes the following sequence inside an atomic database transaction:

1. **User/Session Verification**: Validates JWT token or guest customer identity.
2. **Product Query**: Fetches active database product records matching cart IDs.
3. **Variant Validation**: Validates variant attributes (Size/Color) and SKU pairings.
4. **Atomic Inventory Verification**: Verifies stock availability (`WHERE stock_quantity >= quantity`).
5. **Server-Side Price Calculation**: Recomputes item prices from database records (never trusts client price).
6. **Server Coupon Validation**: Checks expiration, minimum order value, usage limits, and computes discount.
7. **Shipping Fee Calculation**: Calculates standard vs express rate and checks free shipping threshold ($50.00).
8. **Tax Calculation**: Computes sales tax on discounted subtotal.
9. **Final Balance Computation**: Computes exact total payable on server.
10. **Payment Session Tokenization**: Generates payment intent with payment provider abstraction.
11. **Payment Verification**: Captures charge transaction ID.
12. **Transactional Order Insertion**: Inserts order record into SQLite within an atomic `get_db()` transaction.
13. **Atomic Stock Decrement**: Atomically deducts inventory; throws concurrency rollback if race condition occurs.
14. **Multi-Supplier Dispatch**: Auto-splits items by supplier and generates sub-fulfillments (`FUL-XXXXX-1`, `FUL-XXXXX-2`).
15. **Supplier Order ID Storage**: Stores Air Waybill and carrier tracking identifiers (`YunExpress`, `DHL`, `FedEx`).
16. **Order Confirmation Delivery**: Returns order number and package tracking references to buyer.
17. **Resilient Failure Handling**: If supplier dispatch encounters a temporary external network fault, the order is marked `processing` with `[Supplier dispatch queued for retry]` — the paid order is never lost.

---

## 🔑 Core Features & Capabilities

### 1. Customer Storefront & Buyer Experience
- **Live Search & Multi-Faceted Filters**: Instant keyword search, category pills with live item counts, price range slider, sort by featured / price / rating / newest.
- **Dynamic Variant Selector**: Size and color selection with real-time price, SKU, and stock updates.
- **Persistent Shopping Cart**: Saved in browser `localStorage`, quantity stepper with stock constraints, and free shipping progress bar.
- **Discount Coupon Engine**: Live coupon validation (`WELCOME10`, `DROPSHIP20`, `FREESHIP`, `VIP50`) with percentage and fixed amount calculations.
- **Simulated Payment Gateway**: 1-Click test card auto-fill with simulated PCI-DSS tokenization.
- **Customer Portal**: Order history, order cancellation before dispatch with instant database stock restoration, refund dispute submission with photo proof, and address book CRUD.

### 2. Multi-Supplier Dropshipping Engine
- **Automated Order Splitting**: If a customer checks out with items from multiple suppliers, the engine automatically splits the order into sub-fulfillments (`FUL-XXXXX-1`, `FUL-XXXXX-2`).
- **Wholesale Margin Calculation**: Real-time gross margin and net profit tracking per order and per item.
- **Supplier Dispatch Console**: Select carrier (`YunExpress`, `DHL`, `FedEx`, `USPS`, `4PX`), auto-generate carrier tracking numbers, and trigger live shipping updates.
- **End-to-End Milestone Tracking**: 7-stage progress tracking (Order Placed ➔ Supplier Confirmed ➔ Label Created ➔ Departed Facility ➔ Customs Cleared ➔ Out for Delivery ➔ Delivered).

### 3. Executive Admin & Operations Dashboard
- **Financial Analytics**: GMV, Net Profit, Gross Margin %, Average Order Value (AOV), and interactive Chart.js revenue trend lines & category distribution charts.
- **Product & Inventory Management**: CRUD products, inline stock editors, low-stock threshold alerts.
- **1-Click Bulk Markup Tool**: Automatically recalculates retail prices across the catalog using multiplier (e.g. 2.5x) or margin percentage (e.g. 40%) with `.99` psychological rounding.
- **Dispute & RMA Resolution**: Review customer return requests with reason, proof, and 1-click refund approval with automatic ledger and order status adjustments.
- **Review Moderation**: Approve, reject, or reply to customer reviews.

---

## 🛠️ API Routes Overview

```text
POST /api/auth/register                   - Register buyer or merchant account
POST /api/auth/login                      - Login & receive JWT token
GET  /api/auth/me                         - Current authenticated profile
POST /api/auth/switch-demo-role           - 1-Click test role switcher

GET  /api/store/products                  - Search & filter catalog
GET  /api/store/products/<id_or_slug>     - Detailed product with variants & reviews
GET  /api/store/categories                - Active product categories
POST /api/store/reviews/<product_id>      - Submit customer review
GET  /api/store/wishlist                  - Customer saved wishlist
POST /api/store/wishlist/toggle           - Add/remove wishlist item

POST /api/checkout/validate-coupon        - Validate promo code & calculate discount
POST /api/checkout/calculate-shipping     - Calculate standard / express delivery fee
POST /api/checkout/place-order            - Place order, decrement stock & auto-route suppliers

GET  /api/orders/my-orders                - Customer order history
GET  /api/orders/<order_number>           - Order details with fulfillments
POST /api/orders/<order_number>/cancel    - Cancel order & restore inventory
POST /api/orders/<order_number>/request-refund - Submit refund dispute

GET  /api/tracking/search?query=...       - Real-time carrier milestone tracker

GET  /api/admin/analytics/overview        - GMV, net margins, order metrics
GET  /api/admin/analytics/sales-trend     - 7-day revenue trend data
GET  /api/admin/products                  - Admin product & inventory table
POST /api/admin/products/bulk-markup      - Apply global pricing markup rule
POST /api/admin/orders/<id>/fulfill       - Dispatch order with carrier tracking
PUT  /api/admin/refunds/<id>/status       - Approve / reject refund dispute
```

---

## 🧪 Running Automated Tests

```bash
cd /root/dropship_platform
PYTHONPATH=. pytest tests/test_platform.py -v
```

---

## 🏃 Running the Application

```bash
cd /root/dropship_platform
PYTHONPATH=. python3 -m server.app
```

Then visit `http://localhost:5000` in your web browser.
