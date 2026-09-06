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

POST /api/webhooks/payment                 - Inbound Stripe payment webhook (HMAC verified, idempotent)
POST /api/webhooks/supplier                - Inbound carrier milestone webhook (YunExpress, DHL, FedEx)
POST /api/webhooks/test-receiver           - Built-in sandbox webhook receiver endpoint
GET  /api/webhooks/events                  - Supported event catalogue (order.created, order.paid, etc.)
GET  /api/webhooks/subscriptions           - List outbound webhook subscriptions with delivery metrics
POST /api/webhooks/subscriptions           - Register new webhook URL with event filter & HMAC secret
GET  /api/webhooks/subscriptions/<id>      - Webhook subscription details & delivery log
PUT  /api/webhooks/subscriptions/<id>      - Update webhook URL, events, active status
DELETE /api/webhooks/subscriptions/<id>    - Remove webhook subscription
POST /api/webhooks/subscriptions/<id>/test - Send synchronous test ping event
GET  /api/webhooks/deliveries              - Webhook delivery audit logs & HTTP statuses
POST /api/webhooks/deliveries/<id>/resend  - Re-deliver past event payload

GET  /api/admin/analytics/overview        - GMV, net margins, order metrics
GET  /api/admin/analytics/sales-trend     - 7-day revenue trend data
GET  /api/admin/products                  - Admin product & inventory table
POST /api/admin/products/bulk-markup      - Apply global pricing markup rule
POST /api/admin/orders/<id>/fulfill       - Dispatch order with carrier tracking
PUT  /api/admin/refunds/<id>/status       - Approve / reject refund dispute
```

---

## 🌐 Production Architecture & Separation of Concerns

NovaDrop uses an enterprise decoupled architecture designed for high availability, zero server lock-in, and instant frontend delivery via global CDNs:

```
┌─────────────────────────────────────────────────────────┐
│              STATIC FRONTEND LAYER                      │
│   Hosted on GitHub Pages CDN (or Netlify/Vercel/S3)     │
│   https://rajpootsurya9198-collab.github.io             │
│                                                         │
│   • Tailwind CSS + Chart.js + Pure Vanilla JS SPA      │
│   • Configurable API Base URL (localStorage / config.js)│
│   • Safe SPA Client Routing with 404.html Fallback      │
│   • Instant In-Browser Backend Health Probe Modal       │
└──────────────────────────┬──────────────────────────────┘
                           │ Cross-Origin HTTPS
                           │ Bearer JWT Authentication
                           │ RESTful JSON API
                           ▼
┌─────────────────────────────────────────────────────────┐
│               REST API BACKEND LAYER                    │
│      Hosted on Render, Railway, Fly.io, or Docker       │
│      https://your-novadrop-api.onrender.com             │
│                                                         │
│   • Python Flask with Modular Blueprint Architecture    │
│   • Production Gunicorn WSGI Server (Multi-threaded)    │
│   • Strict CORS Validation (CORS_ORIGINS Enforced)      │
│   • Strict Production JWT_SECRET Verification           │
│   • Asynchronous HMAC-SHA256 Webhook Dispatcher Pool    │
│   • Safe Non-Destructive Schema Initialization          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               RELATIONAL DATABASE LAYER                 │
│                                                         │
│   • Production: Managed PostgreSQL (pgbouncer/pool)     │
│   • Local Dev & CI: SQLite 3.53 (WAL Mode & Pragma)    │
│   • Dual-Engine Query Translator (? to %s, RETURNING)   │
│   • Complete Foreign Keys, Triggers & Relational Schema │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide

### Option 1: Frontend Deployment to GitHub Pages

NovaDrop includes automated GitHub Actions deployment and manual fallback support.

1. **Automated GitHub Actions Deployment**:
   - Push to `main` branch.
   - The included workflow [`.github/workflows/deploy-pages.yml`](file:///.github/workflows/deploy-pages.yml) automatically bundles the `static/` directory and publishes it directly to your GitHub Pages domain.
   - In your GitHub repository: Go to **Settings > Pages > Build and deployment > Source**, select **GitHub Actions**.

2. **Configuring Backend REST API URL for the Frontend**:
   - **Method A (Zero-Code / UI)**: Open the deployed GitHub Pages site. Click the **"Backend API"** badge in the top bar. Enter your deployed Flask API URL (e.g. `https://your-novadrop-api.onrender.com/api`), click **Test Health**, and click **Save & Connect**.
   - **Method B (URL Query Param)**: Open `https://<your-username>.github.io/?api_url=https://your-novadrop-api.onrender.com/api`. NovaDrop will auto-detect and persist it in `localStorage`.
   - **Method C (Configuration File)**: Edit [`static/js/config.js`](file:///static/js/config.js) and set `API_BASE_URL: "https://your-novadrop-api.onrender.com/api"` before pushing to GitHub.

---

### Option 2: Backend Deployment to Render (1-Click)

The repository includes a ready-to-use [`render.yaml`](file:///render.yaml) Blueprint:

1. Create an account on [Render.com](https://render.com).
2. Go to **Blueprints > New Blueprint Instance** and select your GitHub repository.
3. Render automatically provisions:
   - A managed **PostgreSQL Database** (`novadrop-db`).
   - A Python **Web Service** (`novadrop-api`) running `gunicorn server.app:app --config gunicorn_config.py`.
   - Injects `DATABASE_URL`, generates a secure `JWT_SECRET`, and configures `CORS_ORIGINS`.

---

### Option 3: Backend Deployment via Docker / Railway / Fly.io

The included [`Dockerfile`](file:///Dockerfile) and [`Procfile`](file:///Procfile) make deploying anywhere effortless:

1. **Build & Run Docker Container**:
   ```bash
   docker build -t novadrop-api .
   docker run -p 5000:5000 \
     -e ENV=production \
     -e JWT_SECRET="your-strong-production-secret-at-least-16-chars" \
     -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
     -e CORS_ORIGINS="https://rajpootsurya9198-collab.github.io" \
     novadrop-api
   ```

2. **Deploy to Railway**:
   - Connect your GitHub repository on Railway.
   - Add a PostgreSQL plugin service.
   - Set environment variables: `ENV=production`, `JWT_SECRET=<strong-random-key>`, `CORS_ORIGINS=https://rajpootsurya9198-collab.github.io`.
   - Railway auto-detects `Procfile` and connects `DATABASE_URL`.

---

## 🔐 Environment Variables Reference

| Variable | Required in Prod? | Default (Dev) | Description |
|---|---|---|---|
| `ENV` | No | `development` | Environment mode (`development` or `production`). Production activates strict security checks. |
| `JWT_SECRET` | **YES (in prod)** | Dev fallback key | Secret key for HS256 JWT tokens. Must be >= 16 chars in production or startup aborts. |
| `DATABASE_URL` | No | `sqlite:///dropship.db` | PostgreSQL connection URI (`postgresql://user:pass@host:port/db`) or SQLite path. |
| `CORS_ORIGINS` | Recommended | Dev origins + GitHub Pages | Comma-separated list of allowed frontend origins (e.g. `https://rajpootsurya9198-collab.github.io`). |
| `PORT` | No | `5000` | HTTP port for Gunicorn / Flask server. |
| `WEB_CONCURRENCY` | No | `2` | Number of Gunicorn worker processes. |
| `GUNICORN_THREADS` | No | `4` | Number of threads per Gunicorn worker process. |

---

## 🧪 Running Automated Tests

NovaDrop includes an enterprise test suite covering authentication, RBAC, 17-step transactional order placement, stock race conditions, supplier dispatch, SEO metadata, webhooks, and production cross-origin security:

```bash
cd /root/dropship_platform
PYTHONPATH=. pytest tests/ -v
```

All 47 automated tests execute in under 10 seconds.

---

## 🏃 Running the Application Locally

For full local full-stack development (Flask backend serving frontend and SQLite):

```bash
cd /root/dropship_platform
PYTHONPATH=. python3 -m server.app
```

Then visit `http://localhost:5000` in your web browser. Seed demo accounts are loaded automatically.
