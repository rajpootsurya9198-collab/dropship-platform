// Executive Admin, Merchant & Supplier Management Hub View

window.AdminDashboardView = {
    activeTab: "overview", // overview, products, orders, suppliers, categories, coupons, reviews, refunds, customers, settings
    chartInstances: {},

    async render(container) {
        const user = window.appState.user;
        if (!user || (user.role !== "admin" && user.role !== "merchant" && user.role !== "supplier")) {
            container.innerHTML = `
                <div class="max-w-md mx-auto py-20 px-4 text-center space-y-6">
                    <div class="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mx-auto text-amber-400">
                        <i data-lucide="shield-alert" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-2xl font-black text-white">Management Access Required</h2>
                    <p class="text-sm text-slate-400">
                        The management hub is reserved for Platform Administrators, Dropship Merchants, and Verified Suppliers.
                    </p>
                    <div class="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                        <div class="text-xs font-bold text-indigo-300">Quick 1-Click Demo Login:</div>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="window.AuthModal.quickSwitchRole('admin')" class="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
                                Enter as SuperAdmin
                            </button>
                            <button onclick="window.AuthModal.quickSwitchRole('merchant')" class="p-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold transition">
                                Enter as Dropshipper
                            </button>
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="min-h-screen pb-16 space-y-8">
                <!-- Top Command Bar -->
                <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider">
                                ${user.role.toUpperCase()} CONSOLE
                            </span>
                            <span class="text-xs text-slate-400">• NovaDrop Operations Hub</span>
                        </div>
                        <h1 class="text-2xl sm:text-3xl font-black text-white">
                            ${user.role === 'admin' ? 'Platform Executive Dashboard' : user.role === 'merchant' ? 'Dropshipper Command Center' : 'Supplier Warehouse Fulfillment'}
                        </h1>
                    </div>

                    <!-- Fast Actions -->
                    <div class="flex flex-wrap items-center gap-3">
                        <button id="admin-bulk-markup-trigger" class="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                            <i data-lucide="percent" class="w-4 h-4 text-indigo-400"></i> Bulk Pricing Markup
                        </button>
                        <a href="#store" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5">
                            <i data-lucide="external-link" class="w-4 h-4"></i> View Live Storefront
                        </a>
                    </div>
                </div>

                <!-- Main Hub Tabs Navigation -->
                <div class="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1 scrollbar-none">
                    <button class="adm-tab ${this.activeTab === 'overview' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="overview">
                        <i data-lucide="bar-chart-3" class="w-4 h-4"></i> Analytics & KPI
                    </button>
                    <button class="adm-tab ${this.activeTab === 'products' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="products">
                        <i data-lucide="package" class="w-4 h-4"></i> Products & Inventory
                    </button>
                    <button class="adm-tab ${this.activeTab === 'orders' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="orders">
                        <i data-lucide="truck" class="w-4 h-4"></i> Orders & Dropship Routing
                    </button>
                    <button class="adm-tab ${this.activeTab === 'suppliers' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="suppliers">
                        <i data-lucide="factory" class="w-4 h-4"></i> Verified Suppliers
                    </button>
                    <button class="adm-tab ${this.activeTab === 'categories' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="categories">
                        <i data-lucide="grid" class="w-4 h-4"></i> Categories
                    </button>
                    <button class="adm-tab ${this.activeTab === 'coupons' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="coupons">
                        <i data-lucide="ticket" class="w-4 h-4"></i> Promo Coupons
                    </button>
                    <button class="adm-tab ${this.activeTab === 'reviews' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="reviews">
                        <i data-lucide="message-square" class="w-4 h-4"></i> Reviews Moderation
                    </button>
                    <button class="adm-tab ${this.activeTab === 'refunds' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="refunds">
                        <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Returns & RMA
                    </button>
                    ${user.role === 'admin' ? `
                        <button class="adm-tab ${this.activeTab === 'customers' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="customers">
                            <i data-lucide="users" class="w-4 h-4"></i> Customers CRM
                        </button>
                    ` : ''}
                    ${(user.role === 'admin' || user.role === 'merchant') ? `
                        <button class="adm-tab ${this.activeTab === 'webhooks' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="webhooks">
                            <i data-lucide="webhook" class="w-4 h-4"></i> Webhooks & API
                        </button>
                    ` : ''}
                    ${user.role === 'admin' ? `
                        <button class="adm-tab ${this.activeTab === 'settings' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="settings">
                            <i data-lucide="settings" class="w-4 h-4"></i> Platform Settings
                        </button>
                    ` : ''}
                </div>

                <!-- Active Tab Workspace -->
                <div id="admin-tab-workspace" class="min-h-[400px]">
                    <!-- Injected tab content -->
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.bindGlobalEvents(container);
        await this.loadCurrentTab();
    },

    bindGlobalEvents(container) {
        container.querySelectorAll(".adm-tab").forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeTab = btn.getAttribute("data-tab");
                this.render(container);
            });
        });

        const markupTrigger = container.querySelector("#admin-bulk-markup-trigger");
        if (markupTrigger) {
            markupTrigger.addEventListener("click", () => this.openBulkMarkupModal());
        }
    },

    async loadCurrentTab() {
        const workspace = document.getElementById("admin-tab-workspace");
        if (!workspace) return;

        switch (this.activeTab) {
            case "overview": await this.renderOverviewTab(workspace); break;
            case "products": await this.renderProductsTab(workspace); break;
            case "orders": await this.renderOrdersTab(workspace); break;
            case "suppliers": await this.renderSuppliersTab(workspace); break;
            case "categories": await this.renderCategoriesTab(workspace); break;
            case "coupons": await this.renderCouponsTab(workspace); break;
            case "reviews": await this.renderReviewsTab(workspace); break;
            case "refunds": await this.renderRefundsTab(workspace); break;
            case "customers": await this.renderCustomersTab(workspace); break;
            case "webhooks": await this.renderWebhooksTab(workspace); break;
            case "settings": await this.renderSettingsTab(workspace); break;
            default: await this.renderOverviewTab(workspace);
        }
    },

    // -------------------------------------------------------------
    // TAB 1: OVERVIEW & ANALYTICS
    // -------------------------------------------------------------
    async renderOverviewTab(container) {
        container.innerHTML = `
            <div class="py-16 text-center text-slate-400">
                <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs font-semibold">Aggregating live financial ledger metrics...</span>
            </div>
        `;

        try {
            const [overview, trend, catData, topProds] = await Promise.all([
                window.api.getAdminAnalytics(),
                window.api.getSalesTrend(),
                window.api.getCategoryBreakdown(),
                window.api.getTopProducts()
            ]);

            container.innerHTML = `
                <div class="space-y-8">
                    <!-- KPI Metric Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        
                        <!-- GMV -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                            <div class="flex items-center justify-between text-xs text-slate-400">
                                <span>Gross Merchandise Value</span>
                                <span class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400"><i data-lucide="dollar-sign" class="w-4 h-4"></i></span>
                            </div>
                            <div class="text-2xl sm:text-3xl font-black text-white">$${overview.gmv.toFixed(2)}</div>
                            <div class="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +18.4% vs last period
                            </div>
                        </div>

                        <!-- Net Profit -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                            <div class="flex items-center justify-between text-xs text-slate-400">
                                <span>Net Dropship Profit</span>
                                <span class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"><i data-lucide="wallet" class="w-4 h-4"></i></span>
                            </div>
                            <div class="text-2xl sm:text-3xl font-black text-emerald-400">$${overview.net_profit.toFixed(2)}</div>
                            <div class="text-[11px] text-slate-400 font-medium">
                                Margin: <strong class="text-white">${overview.margin_percent}%</strong> (after supplier wholesale)
                            </div>
                        </div>

                        <!-- Total Orders -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                            <div class="flex items-center justify-between text-xs text-slate-400">
                                <span>Total Paid Orders</span>
                                <span class="p-2 rounded-xl bg-cyan-500/20 text-cyan-400"><i data-lucide="shopping-bag" class="w-4 h-4"></i></span>
                            </div>
                            <div class="text-2xl sm:text-3xl font-black text-white">${overview.total_orders}</div>
                            <div class="text-[11px] text-slate-400">
                                Average Order Value: <strong class="text-indigo-300">$${overview.average_order_value.toFixed(2)}</strong>
                            </div>
                        </div>

                        <!-- Low Stock / Pending -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
                            <div class="flex items-center justify-between text-xs text-slate-400">
                                <span>Fulfillment Ops</span>
                                <span class="p-2 rounded-xl bg-amber-500/20 text-amber-400"><i data-lucide="alert-triangle" class="w-4 h-4"></i></span>
                            </div>
                            <div class="text-2xl sm:text-3xl font-black text-white">${overview.pending_fulfillments}</div>
                            <div class="text-[11px] text-amber-400 font-semibold">
                                ${overview.low_stock_count} SKUs at low stock threshold
                            </div>
                        </div>
                    </div>

                    <!-- Charts Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Sales Trend Chart -->
                        <div class="lg:col-span-2 p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i> 7-Day Revenue & Profit Trajectory
                                </h3>
                                <span class="text-xs text-slate-400 font-medium">Daily Metrics</span>
                            </div>
                            <div class="relative h-64">
                                <canvas id="salesTrendChart"></canvas>
                            </div>
                        </div>

                        <!-- Category Distribution Chart -->
                        <div class="lg:col-span-1 p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-400"></i> Revenue by Category
                            </h3>
                            <div class="relative h-64 flex items-center justify-center">
                                <canvas id="categoryChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Top Products Table -->
                    <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                        <h3 class="text-sm font-bold text-white flex items-center gap-2">
                            <i data-lucide="trophy" class="w-4 h-4 text-amber-400"></i> Top Revenue Generating Products
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="text-slate-400 uppercase tracking-wider border-b border-slate-700/80 pb-2">
                                    <tr>
                                        <th class="py-3 px-3">Product Name</th>
                                        <th class="py-3 px-3">Category</th>
                                        <th class="py-3 px-3">Wholesale Cost</th>
                                        <th class="py-3 px-3">Selling Retail</th>
                                        <th class="py-3 px-3">Net Margin</th>
                                        <th class="py-3 px-3 text-right">Units Sold</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-700/50 text-slate-300">
                                    ${topProds.top_products.map(p => `
                                        <tr class="hover:bg-slate-750 transition">
                                            <td class="py-3 px-3 font-bold text-white">${p.title}</td>
                                            <td class="py-3 px-3 text-indigo-400 font-semibold">${p.category_name}</td>
                                            <td class="py-3 px-3 font-mono">$${p.cost_price.toFixed(2)}</td>
                                            <td class="py-3 px-3 font-mono font-bold text-white">$${p.retail_price.toFixed(2)}</td>
                                            <td class="py-3 px-3 text-emerald-400 font-bold">+$${p.profit_margin_usd.toFixed(2)} (${p.profit_margin_percent}%)</td>
                                            <td class="py-3 px-3 text-right font-black text-white">${p.total_sold}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            // Initialize Chart.js
            this.initOverviewCharts(trend, catData);

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs text-center py-8">Failed to load analytics: ${err.message}</div>`;
        }
    },

    initOverviewCharts(trend, catData) {
        if (!window.Chart) return;

        // Sales Trend Line Chart
        const ctxTrend = document.getElementById("salesTrendChart");
        if (ctxTrend) {
            if (this.chartInstances.trend) this.chartInstances.trend.destroy();
            this.chartInstances.trend = new window.Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: trend.labels,
                    datasets: [
                        {
                            label: 'Revenue ($)',
                            data: trend.revenue,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5
                        },
                        {
                            label: 'Net Profit ($)',
                            data: trend.profit,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { size: 11, weight: '600' } } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
                    }
                }
            });
        }

        // Category Doughnut Chart
        const ctxCat = document.getElementById("categoryChart");
        if (ctxCat) {
            if (this.chartInstances.category) this.chartInstances.category.destroy();
            this.chartInstances.category = new window.Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: catData.labels,
                    datasets: [{
                        data: catData.values,
                        backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }
                    }
                }
            });
        }
    },

    // -------------------------------------------------------------
    // TAB 2: PRODUCTS & INVENTORY
    // -------------------------------------------------------------
    async renderProductsTab(container) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs">Loading product catalog...</span>
            </div>
        `;

        try {
            const [prodsRes, catsRes, supsRes] = await Promise.all([
                window.api.getAdminProducts(),
                window.api.getAdminCategories(),
                window.api.getAdminSuppliers()
            ]);

            const products = prodsRes.products || [];
            const categories = catsRes.categories || [];
            const suppliers = supsRes.suppliers || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Controls Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <input type="text" id="adm-prod-search" placeholder="Search title or SKU..."
                                   class="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-48 sm:w-64">
                            <select id="adm-prod-cat-filter" class="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                                <option value="">All Categories</option>
                                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <button id="add-new-product-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i> Add New Product
                        </button>
                    </div>

                    <!-- Products Table -->
                    <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-md overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-700">
                                    <tr>
                                        <th class="py-3 px-4">Item & SKU</th>
                                        <th class="py-3 px-4">Supplier & Origin</th>
                                        <th class="py-3 px-4">Wholesale Cost</th>
                                        <th class="py-3 px-4">Selling Retail</th>
                                        <th class="py-3 px-4">Gross Margin</th>
                                        <th class="py-3 px-4">Stock Level</th>
                                        <th class="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-700/50 text-slate-300">
                                    ${products.map(p => `
                                        <tr class="hover:bg-slate-750 transition" data-id="${p.id}">
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-3">
                                                    <img src="${p.primary_image}" class="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-700">
                                                    <div>
                                                        <div class="font-bold text-white line-clamp-1 max-w-[200px]">${p.title}</div>
                                                        <div class="text-[10px] font-mono text-slate-400">${p.sku} • ${p.category_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="font-semibold text-slate-200">${p.supplier_name}</div>
                                                <div class="text-[10px] text-slate-400">${p.shipping_origin.split(',')[0]}</div>
                                            </td>
                                            <td class="py-3 px-4 font-mono">$${p.cost_price.toFixed(2)}</td>
                                            <td class="py-3 px-4 font-mono font-bold text-white">$${p.retail_price.toFixed(2)}</td>
                                            <td class="py-3 px-4 font-bold text-emerald-400">
                                                +$${p.profit_margin_usd.toFixed(2)} (${p.profit_margin_percent}%)
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-2">
                                                    <input type="number" class="quick-stock-input w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center"
                                                           value="${p.stock_quantity}" data-id="${p.id}">
                                                    <span class="text-[10px] ${p.stock_quantity <= p.low_stock_threshold ? 'text-amber-400 font-bold' : 'text-slate-500'}">units</span>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4 text-right">
                                                <div class="flex items-center justify-end gap-2">
                                                    <button class="edit-prod-btn p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition" data-id="${p.id}" title="Edit product">
                                                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                    <button class="del-prod-btn p-1.5 rounded-lg bg-slate-700 hover:bg-rose-900/60 text-slate-300 hover:text-rose-400 transition" data-id="${p.id}" title="Delete product">
                                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            this.bindProductsEvents(container, categories, suppliers);

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load products: ${err.message}</div>`;
        }
    },

    bindProductsEvents(container, categories, suppliers) {
        // Add Product Modal
        const addBtn = container.querySelector("#add-new-product-btn");
        if (addBtn) {
            addBtn.addEventListener("click", () => this.openProductFormModal(null, categories, suppliers));
        }

        // Edit Product
        container.querySelectorAll(".edit-prod-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                try {
                    const res = await window.api.getProductForEdit(id);
                    this.openProductFormModal(res.product, categories, suppliers);
                } catch (err) {
                    window.showToast("Failed to load product details.", "error");
                }
            });
        });

        // Delete Product
        container.querySelectorAll(".del-prod-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                if (confirm("Delete this product from catalog?")) {
                    try {
                        await window.api.deleteProduct(id);
                        window.showToast("Product deleted.", "info");
                        await this.renderProductsTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                    }
                }
            });
        });

        // Quick Stock Input
        container.querySelectorAll(".quick-stock-input").forEach(input => {
            input.addEventListener("change", async () => {
                const id = input.getAttribute("data-id");
                const stock = parseInt(input.value);
                try {
                    await window.api.adjustStock(id, stock);
                    window.showToast("Stock updated.", "success");
                } catch (err) {
                    window.showToast(err.message, "error");
                }
            });
        });
    },

    // -------------------------------------------------------------
    // TAB 3: ORDERS & DROPSHIP ROUTING
    // -------------------------------------------------------------
    async renderOrdersTab(container) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs">Loading orders and split fulfillments...</span>
            </div>
        `;

        try {
            const res = await window.api.getAdminOrders();
            const orders = res.orders || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <i data-lucide="boxes" class="w-5 h-5 text-indigo-400"></i> Real-time Dropshipping Fulfillment Stream
                        </h3>
                        <span class="text-xs text-slate-400 font-medium">${orders.length} total orders</span>
                    </div>

                    <div class="space-y-4">
                        ${orders.map(o => `
                            <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-base font-black text-white font-mono">#${o.order_number}</span>
                                            <select class="adm-order-status-select bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-300"
                                                    data-id="${o.id}">
                                                <option value="pending" ${o.order_status === 'pending' ? 'selected' : ''}>Pending Payment</option>
                                                <option value="processing" ${o.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                                                <option value="shipped" ${o.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                                <option value="delivered" ${o.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                                <option value="cancelled" ${o.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                                <option value="disputed" ${o.order_status === 'disputed' ? 'selected' : ''}>Disputed</option>
                                            </select>
                                        </div>
                                        <div class="text-xs text-slate-400 mt-1">
                                            Customer: <strong class="text-white">${o.customer_name}</strong> (${o.customer_email}) • ${o.created_at}
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <button class="open-dispatch-modal-btn px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                                                data-id="${o.id}" data-num="${o.order_number}">
                                            <i data-lucide="truck" class="w-3.5 h-3.5"></i> Fulfill & Dispatch
                                        </button>
                                        <a href="#tracking?order=${o.order_number}" class="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
                                            <i data-lucide="navigation" class="w-3.5 h-3.5"></i> Live Tracking
                                        </a>
                                    </div>
                                </div>

                                <!-- Financials & Routing Breakdown -->
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                                    <div>
                                        <span class="text-slate-400">Total Billed:</span>
                                        <div class="font-black text-white font-mono">$${o.total_amount.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span class="text-slate-400">Wholesale Cost:</span>
                                        <div class="font-black text-slate-300 font-mono">$${(o.total_cost || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span class="text-slate-400">Merchant Net Profit:</span>
                                        <div class="font-black text-emerald-400 font-mono">+$${o.profit_margin_usd.toFixed(2)} (${o.profit_margin_percent}%)</div>
                                    </div>
                                    <div>
                                        <span class="text-slate-400">Payment Status:</span>
                                        <div class="font-bold text-indigo-300 uppercase tracking-wide">${o.payment_status}</div>
                                    </div>
                                </div>

                                <!-- Fulfillments -->
                                ${o.fulfillments && o.fulfillments.length > 0 ? `
                                    <div class="space-y-2 pt-1">
                                        <div class="text-xs font-bold text-slate-300">Supplier Dispatches:</div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            ${o.fulfillments.map(f => `
                                                <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs flex justify-between items-center">
                                                    <div>
                                                        <div class="font-bold text-white">${f.carrier} (${f.supplier_name || 'Warehouse'})</div>
                                                        <div class="text-[10px] font-mono text-indigo-300">${f.tracking_number}</div>
                                                    </div>
                                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${f.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'}">
                                                        ${f.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            this.bindOrdersEvents(container);

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load orders: ${err.message}</div>`;
        }
    },

    bindOrdersEvents(container) {
        // Status dropdown change
        container.querySelectorAll(".adm-order-status-select").forEach(sel => {
            sel.addEventListener("change", async () => {
                const id = sel.getAttribute("data-id");
                const newStatus = sel.value;
                try {
                    await window.api.updateOrderStatus(id, newStatus);
                    window.showToast(`Order status set to ${newStatus}.`, "success");
                } catch (err) {
                    window.showToast(err.message, "error");
                }
            });
        });

        // Open Dispatch Modal
        container.querySelectorAll(".open-dispatch-modal-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const num = btn.getAttribute("data-num");
                this.openDispatchModal(id, num);
            });
        });
    },

    openDispatchModal(orderId, orderNumber) {
        let modal = document.getElementById("dispatch-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "dispatch-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="truck" class="w-5 h-5 text-indigo-400"></i> Dispatch Order #${orderNumber}
                    </h3>
                    <button class="close-modal-btn text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Select Shipping Carrier</label>
                        <select id="dispatch-carrier-select" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            <option value="YunExpress">YunExpress Priority Direct Line (Asia/US/EU)</option>
                            <option value="DHL">DHL Express Worldwide Air Cargo</option>
                            <option value="FedEx">FedEx International Priority</option>
                            <option value="USPS">USPS Priority Ground Delivery</option>
                            <option value="4PX">4PX Worldwide Express</option>
                            <option value="ePacket">ePacket Fast Postal Service</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Carrier Tracking Number</label>
                        <div class="flex gap-2">
                            <input type="text" id="dispatch-tracking-num" placeholder="Leave empty to auto-generate"
                                   class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500">
                            <button id="gen-tracking-btn" class="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition whitespace-nowrap">
                                Auto-Gen
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Service Level</label>
                        <input type="text" id="dispatch-service-level" value="Priority Express Delivery"
                               class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button class="close-modal-btn text-xs text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button id="confirm-dispatch-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-1.5">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Confirm & Notify Customer
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        const close = () => modal.classList.add("hidden");
        modal.querySelectorAll(".close-modal-btn").forEach(b => b.addEventListener("click", close));

        const genBtn = modal.querySelector("#gen-tracking-btn");
        const carrierSelect = modal.querySelector("#dispatch-carrier-select");
        const trackingInput = modal.querySelector("#dispatch-tracking-num");

        genBtn.addEventListener("click", () => {
            const c = carrierSelect.value.toUpperCase().slice(0, 3);
            const rand = Math.floor(10000000 + Math.random() * 90000000);
            trackingInput.value = `${c}-${rand}US`;
        });

        const confirmBtn = modal.querySelector("#confirm-dispatch-btn");
        confirmBtn.addEventListener("click", async () => {
            const carrier = carrierSelect.value;
            const tracking_number = trackingInput.value.trim();
            const carrier_service = modal.querySelector("#dispatch-service-level").value.trim();

            try {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
                const res = await window.api.fulfillOrder(orderId, {
                    carrier,
                    tracking_number,
                    carrier_service
                });
                window.showToast(res.message, "success");
                close();
                await this.renderOrdersTab(document.getElementById("admin-tab-workspace"));
            } catch (err) {
                window.showToast(err.message, "error");
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Confirm & Notify Customer";
            }
        });
    },

    // -------------------------------------------------------------
    // TAB 4: SUPPLIERS
    // -------------------------------------------------------------
    async renderSuppliersTab(container) {
        try {
            const res = await window.api.getAdminSuppliers();
            const suppliers = res.suppliers || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <i data-lucide="factory" class="w-5 h-5 text-indigo-400"></i> Global Verified Dropship Suppliers (${suppliers.length})
                        </h3>
                        <button id="add-supplier-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Supplier Partner
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${suppliers.map(s => `
                            <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h4 class="text-base font-bold text-white">${s.name}</h4>
                                            ${s.is_verified ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Verified</span>' : ''}
                                        </div>
                                        <div class="text-xs font-mono text-indigo-400 mt-0.5">${s.code} • Contact: ${s.contact_name}</div>
                                    </div>
                                    <div class="text-amber-400 text-xs font-bold flex items-center gap-1">
                                        <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i> ${s.rating}
                                    </div>
                                </div>

                                <div class="space-y-1.5 text-xs text-slate-300">
                                    <div><span class="text-slate-400">Logistics Hub:</span> ${s.shipping_origin}</div>
                                    <div><span class="text-slate-400">Contact Email:</span> <a href="mailto:${s.email}" class="text-indigo-400 hover:underline">${s.email}</a></div>
                                    <div><span class="text-slate-400">Fulfillment SLA:</span> <strong class="text-white">${s.fulfillment_sla_days} Days Max Dispatch</strong></div>
                                    <div><span class="text-slate-400">Return Policy:</span> ${s.return_policy || 'Standard 30 days'}</div>
                                </div>

                                <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                                    <span class="text-slate-400"><strong>${s.product_count || 0}</strong> Active Products in Catalog</span>
                                    <span class="text-emerald-400 font-bold font-mono"><strong>${s.total_orders_fulfilled || 0}</strong> Orders Fulfilled</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            const addSupBtn = container.querySelector("#add-supplier-btn");
            if (addSupBtn) {
                addSupBtn.addEventListener("click", () => this.openSupplierModal());
            }
        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load suppliers: ${err.message}</div>`;
        }
    },

    openSupplierModal() {
        const name = prompt("Supplier Company Name:", "ApexTech Global Supply");
        if (!name) return;
        const code = prompt("Supplier Code (e.g. SUP-APEX-05):", "SUP-CUSTOM-05");
        if (!code) return;
        const contact = prompt("Contact Person:", "David Chen");
        const email = prompt("Email:", "contact@supplier.com");
        const origin = prompt("Shipping Origin Hub:", "Shenzhen, China");

        if (name && code && email && origin) {
            window.api.createSupplier({
                name, code, contact_name: contact, email, shipping_origin: origin, country: "China"
            }).then(() => {
                window.showToast("Supplier created successfully!", "success");
                this.renderSuppliersTab(document.getElementById("admin-tab-workspace"));
            }).catch(err => window.showToast(err.message, "error"));
        }
    },

    // -------------------------------------------------------------
    // TAB 5: CATEGORIES
    // -------------------------------------------------------------
    async renderCategoriesTab(container) {
        try {
            const res = await window.api.getAdminCategories();
            const categories = res.categories || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <i data-lucide="grid" class="w-5 h-5 text-indigo-400"></i> Storefront Categories (${categories.length})
                        </h3>
                        <button id="add-cat-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Category
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${categories.map(c => `
                            <div class="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                                <div class="aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                                    <img src="${c.image_url}" class="w-full h-full object-cover">
                                </div>
                                <div class="flex items-center justify-between">
                                    <h4 class="text-sm font-bold text-white">${c.name}</h4>
                                    <span class="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">${c.product_count} items</span>
                                </div>
                                <p class="text-xs text-slate-400 line-clamp-2">${c.description}</p>
                                <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                                    <span class="text-slate-500 font-mono text-[10px]">slug: ${c.slug}</span>
                                    <button class="del-cat-btn text-slate-400 hover:text-rose-400 p-1" data-id="${c.id}">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelector("#add-cat-btn").addEventListener("click", () => {
                const name = prompt("Category Name:", "Smart Wearables");
                if (!name) return;
                const desc = prompt("Category Description:", "Intelligent health rings, watches, and sensors");
                window.api.createCategory({ name, description: desc }).then(() => {
                    window.showToast("Category added!", "success");
                    this.renderCategoriesTab(container);
                }).catch(err => window.showToast(err.message, "error"));
            });

            container.querySelectorAll(".del-cat-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    if (confirm("Delete this category?")) {
                        await window.api.deleteCategory(id);
                        window.showToast("Category deleted.", "info");
                        this.renderCategoriesTab(container);
                    }
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load categories: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB 6: COUPONS
    // -------------------------------------------------------------
    async renderCouponsTab(container) {
        try {
            const res = await window.api.getAdminCoupons();
            const coupons = res.coupons || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <i data-lucide="ticket" class="w-5 h-5 text-indigo-400"></i> Promotional Discount Coupons (${coupons.length})
                        </h3>
                        <button id="add-coupon-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus" class="w-4 h-4"></i> Create Coupon
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        ${coupons.map(cp => `
                            <div class="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="px-3 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 text-sm font-black font-mono tracking-wider">
                                            ${cp.code}
                                        </span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${cp.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}">
                                            ${cp.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button class="toggle-coupon-btn text-xs text-indigo-400 hover:underline" data-id="${cp.id}">
                                            ${cp.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button class="del-coupon-btn text-slate-400 hover:text-rose-400 p-1" data-id="${cp.id}">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-slate-300">${cp.description || 'Promotional coupon code'}</p>
                                <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                                    <span>Discount: <strong class="text-white">${cp.discount_type === 'percentage' ? `${cp.discount_value}% OFF` : `$${cp.discount_value} OFF`}</strong></span>
                                    <span>Used: <strong class="text-white">${cp.times_used} / ${cp.usage_limit}</strong></span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelector("#add-coupon-btn").addEventListener("click", () => {
                const code = prompt("Coupon Code (e.g. FLASH30):", "SUMMER25");
                if (!code) return;
                const val = prompt("Discount Value (e.g. 25 for 25%):", "25");
                const desc = prompt("Coupon Description:", "25% discount on all orders");
                window.api.createCoupon({
                    code, discount_type: "percentage", discount_value: parseFloat(val), description: desc
                }).then(() => {
                    window.showToast("Coupon created successfully!", "success");
                    this.renderCouponsTab(container);
                }).catch(err => window.showToast(err.message, "error"));
            });

            container.querySelectorAll(".toggle-coupon-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    await window.api.toggleCoupon(id);
                    this.renderCouponsTab(container);
                });
            });

            container.querySelectorAll(".del-coupon-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    if (confirm("Delete coupon?")) {
                        await window.api.deleteCoupon(id);
                        window.showToast("Coupon deleted.", "info");
                        this.renderCouponsTab(container);
                    }
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load coupons: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB 7: REVIEWS MODERATION
    // -------------------------------------------------------------
    async renderReviewsTab(container) {
        try {
            const res = await window.api.getAdminReviews();
            const reviews = res.reviews || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="message-square" class="w-5 h-5 text-indigo-400"></i> Customer Reviews Moderation (${reviews.length})
                    </h3>

                    <div class="space-y-4">
                        ${reviews.map(r => `
                            <div class="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="text-sm font-bold text-white">${r.product_title}</div>
                                        <div class="text-xs text-slate-400 mt-0.5">By <strong>${r.user_name}</strong> (${r.user_email}) • ${r.created_at}</div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="text-amber-400 text-xs font-bold">${'★'.repeat(r.rating)}</div>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                            ${r.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div class="text-xs font-bold text-slate-200">${r.title}</div>
                                <p class="text-xs text-slate-300 leading-relaxed">${r.comment}</p>

                                <div class="pt-3 border-t border-slate-700/60 flex items-center justify-end gap-2">
                                    ${r.status !== 'approved' ? `
                                        <button class="approve-rev-btn px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition" data-id="${r.id}">
                                            Approve Review
                                        </button>
                                    ` : `
                                        <button class="reject-rev-btn px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition" data-id="${r.id}">
                                            Hide Review
                                        </button>
                                    `}
                                    <button class="del-rev-btn text-slate-400 hover:text-rose-400 p-1.5" data-id="${r.id}">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelectorAll(".approve-rev-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    await window.api.updateReviewStatus(id, "approved");
                    window.showToast("Review approved.", "success");
                    this.renderReviewsTab(container);
                });
            });

            container.querySelectorAll(".reject-rev-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    await window.api.updateReviewStatus(id, "rejected");
                    window.showToast("Review hidden.", "info");
                    this.renderReviewsTab(container);
                });
            });

            container.querySelectorAll(".del-rev-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    if (confirm("Delete review?")) {
                        await window.api.deleteReview(id);
                        this.renderReviewsTab(container);
                    }
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load reviews: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB 8: REFUNDS & DISPUTES
    // -------------------------------------------------------------
    async renderRefundsTab(container) {
        try {
            const res = await window.api.getAdminRefunds();
            const refunds = res.refunds || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="rotate-ccw" class="w-5 h-5 text-indigo-400"></i> Returns, RMA & Buyer Disputes (${refunds.length})
                    </h3>

                    <div class="space-y-4">
                        ${refunds.map(rf => `
                            <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-bold text-white font-mono">Dispute on #${rf.order_number}</span>
                                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rf.status === 'approved' || rf.status === 'refunded' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                                ${rf.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div class="text-xs text-slate-400 mt-0.5">Buyer: <strong>${rf.customer_name}</strong> • Supplier: <strong>${rf.supplier_name || 'Global Warehouse'}</strong></div>
                                    </div>
                                    <div class="text-base font-black text-rose-400 font-mono">
                                        Claim: $${rf.requested_amount.toFixed(2)}
                                    </div>
                                </div>

                                <div class="space-y-1.5 text-xs">
                                    <div><span class="text-slate-400">Reason:</span> <strong class="text-white">${rf.reason}</strong></div>
                                    <p class="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">${rf.details}</p>
                                </div>

                                <div class="pt-3 border-t border-slate-700/60 flex items-center justify-end gap-3">
                                    ${rf.status !== 'approved' && rf.status !== 'refunded' ? `
                                        <button class="approve-refund-btn px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5" data-id="${rf.id}" data-amt="${rf.requested_amount}">
                                            <i data-lucide="check" class="w-3.5 h-3.5"></i> Approve Refund & Adjust Ledger
                                        </button>
                                        <button class="reject-refund-btn px-4 py-2 rounded-xl bg-slate-700 hover:bg-rose-900/60 text-slate-200 text-xs font-bold transition" data-id="${rf.id}">
                                            Reject Claim
                                        </button>
                                    ` : `
                                        <span class="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                            <i data-lucide="check-circle" class="w-4 h-4"></i> Refund Resolved & Transacted
                                        </span>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelectorAll(".approve-refund-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    const amt = b.getAttribute("data-amt");
                    try {
                        await window.api.updateRefundStatus(id, {
                            status: "refunded",
                            refund_amount: parseFloat(amt),
                            admin_notes: "Dispute approved and refunded to customer."
                        });
                        window.showToast("Refund processed and order status updated.", "success");
                        this.renderRefundsTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                    }
                });
            });

            container.querySelectorAll(".reject-refund-btn").forEach(b => {
                b.addEventListener("click", async () => {
                    const id = b.getAttribute("data-id");
                    const reason = prompt("State reason for dispute rejection:", "Evidence insufficient or product within spec.");
                    if (!reason) return;
                    await window.api.updateRefundStatus(id, {
                        status: "rejected",
                        admin_notes: reason
                    });
                    window.showToast("Dispute rejected.", "info");
                    this.renderRefundsTab(container);
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load refunds: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB 9: CUSTOMERS CRM
    // -------------------------------------------------------------
    async renderCustomersTab(container) {
        try {
            const res = await window.api.getAdminUsers("customer");
            const customers = res.users || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="users" class="w-5 h-5 text-indigo-400"></i> Registered Customer Directory (${customers.length})
                    </h3>

                    <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-md">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-700">
                                <tr>
                                    <th class="py-3 px-4">Customer Name & Email</th>
                                    <th class="py-3 px-4">Phone</th>
                                    <th class="py-3 px-4">Total Orders</th>
                                    <th class="py-3 px-4 font-mono">Lifetime Spend</th>
                                    <th class="py-3 px-4">Joined Date</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-700/50 text-slate-300">
                                ${customers.map(c => `
                                    <tr class="hover:bg-slate-750 transition">
                                        <td class="py-3 px-4 font-bold text-white">
                                            ${c.full_name}
                                            <div class="text-[10px] text-slate-400 font-normal">${c.email}</div>
                                        </td>
                                        <td class="py-3 px-4 text-slate-400">${c.phone || 'N/A'}</td>
                                        <td class="py-3 px-4 font-bold text-indigo-300">${c.total_orders}</td>
                                        <td class="py-3 px-4 font-mono font-black text-emerald-400">$${(c.lifetime_spend || 0).toFixed(2)}</td>
                                        <td class="py-3 px-4 text-slate-400">${c.created_at ? c.created_at.split(' ')[0] : '2026'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load customers: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB 10: PLATFORM SETTINGS
    // -------------------------------------------------------------
    async renderSettingsTab(container) {
        try {
            const res = await window.api.getAdminSettings();
            const map = res.settings_map || {};

            container.innerHTML = `
                <div class="max-w-2xl p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-6">
                    <h3 class="text-base font-bold text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                        <i data-lucide="settings" class="w-5 h-5 text-indigo-400"></i> Store & Dropship Platform Configuration
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Store Brand Name</label>
                            <input type="text" id="set-store-name" value="${map.store_name || 'NovaDrop Lifestyle & Tech'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                        </div>

                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Customer Support Email</label>
                            <input type="email" id="set-support-email" value="${map.support_email || 'support@novadrop.io'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Free Shipping Threshold ($)</label>
                                <input type="number" id="set-free-ship" value="${map.free_shipping_threshold || '50.00'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Estimated Tax Rate (%)</label>
                                <input type="number" id="set-tax-rate" value="${map.tax_rate_percent || '8.0'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Standard Shipping Fee ($)</label>
                                <input type="number" id="set-std-ship" value="${map.standard_shipping_fee || '4.99'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Express Priority Fee ($)</label>
                                <input type="number" id="set-exp-ship" value="${map.express_shipping_fee || '14.99'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                        </div>

                        <button id="save-settings-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2">
                            <i data-lucide="save" class="w-4 h-4"></i> Save Store Settings
                        </button>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelector("#save-settings-btn").addEventListener("click", async () => {
                const payload = {
                    store_name: container.querySelector("#set-store-name").value.trim(),
                    support_email: container.querySelector("#set-support-email").value.trim(),
                    free_shipping_threshold: container.querySelector("#set-free-ship").value.trim(),
                    tax_rate_percent: container.querySelector("#set-tax-rate").value.trim(),
                    standard_shipping_fee: container.querySelector("#set-std-ship").value.trim(),
                    express_shipping_fee: container.querySelector("#set-exp-ship").value.trim()
                };

                try {
                    await window.api.saveAdminSettings(payload);
                    window.showToast("Settings updated successfully!", "success");
                } catch (err) {
                    window.showToast(err.message, "error");
                }
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load settings: ${err.message}</div>`;
        }
    },

    // -------------------------------------------------------------
    // TAB: WEBHOOKS & API INTEGRATIONS
    // -------------------------------------------------------------
    async renderWebhooksTab(container) {
        container.innerHTML = `
            <div class="py-16 text-center text-slate-400">
                <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs font-semibold">Loading webhook endpoints and delivery logs...</span>
            </div>
        `;

        try {
            const [subsRes, delivRes] = await Promise.all([
                window.api.getWebhookSubscriptions(),
                window.api.getWebhookDeliveries(null, "", 30)
            ]);

            const subscriptions = subsRes.subscriptions || [];
            const deliveries = delivRes.deliveries || [];

            const totalDeliveries = deliveries.length;
            const successDeliveries = deliveries.filter(d => d.is_success).length;
            const failedDeliveries = totalDeliveries - successDeliveries;

            container.innerHTML = `
                <div class="space-y-8">
                    <!-- Webhooks Header & Overview -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                    Enterprise Webhooks
                                </span>
                                <span class="text-xs text-slate-400">• HMAC-SHA256 Signed</span>
                            </div>
                            <h2 class="text-xl font-bold text-white mt-1">Webhooks & Event Subscriptions</h2>
                            <p class="text-xs text-slate-400 mt-1 max-w-2xl">
                                Configure HTTP POST destinations to receive instantaneous events when orders are placed, paid, fulfilled, or cancelled. Payloads are signed with an HMAC-SHA256 signature header (<code class="text-indigo-300">X-NovaDrop-Signature</code>).
                            </p>
                        </div>
                        <button id="add-webhook-btn" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shrink-0">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Webhook Endpoint
                        </button>
                    </div>

                    <!-- Webhook Delivery Metrics -->
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                            <div class="text-xs text-slate-400">Active Endpoints</div>
                            <div class="text-2xl font-black text-white mt-1">${subscriptions.filter(s => s.is_active).length} / ${subscriptions.length}</div>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                            <div class="text-xs text-slate-400">Recent Deliveries Logged</div>
                            <div class="text-2xl font-black text-indigo-400 mt-1">${totalDeliveries}</div>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                            <div class="text-xs text-slate-400">Successful Dispatches (2xx)</div>
                            <div class="text-2xl font-black text-emerald-400 mt-1">${successDeliveries}</div>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                            <div class="text-xs text-slate-400">Failed Dispatches</div>
                            <div class="text-2xl font-black text-rose-400 mt-1">${failedDeliveries}</div>
                        </div>
                    </div>

                    <!-- Subscriptions List -->
                    <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-bold text-white flex items-center gap-2">
                                <i data-lucide="radio" class="w-4 h-4 text-indigo-400"></i> Registered Endpoints (${subscriptions.length})
                            </h3>
                            <button id="quick-demo-webhook-btn" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline">
                                + Add Built-in Sandbox Receiver
                            </button>
                        </div>

                        ${subscriptions.length === 0 ? `
                            <div class="py-12 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
                                <i data-lucide="webhook" class="w-10 h-10 mx-auto mb-2 text-slate-500"></i>
                                <div class="text-sm font-bold text-slate-300">No Webhook Endpoints Configured</div>
                                <div class="text-xs text-slate-500 mt-1">Register your first HTTP endpoint to start streaming order and tracking events.</div>
                                <button id="add-webhook-empty-btn" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                                    Create Webhook
                                </button>
                            </div>
                        ` : `
                            <div class="space-y-3">
                                ${subscriptions.map(sub => `
                                    <div class="p-4 rounded-xl bg-slate-900/80 border ${sub.is_active ? 'border-slate-700/80' : 'border-slate-800 opacity-60'} flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div class="space-y-1.5 min-w-0">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${sub.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}">
                                                    ${sub.is_active ? 'ACTIVE' : 'DISABLED'}
                                                </span>
                                                <code class="text-xs font-bold text-indigo-300 font-mono break-all">${sub.url}</code>
                                            </div>
                                            ${sub.description ? `<div class="text-xs text-slate-300">${sub.description}</div>` : ''}
                                            <div class="flex items-center gap-1.5 flex-wrap pt-1">
                                                <span class="text-[11px] text-slate-400">Events:</span>
                                                ${(sub.events || ["*"]).map(ev => `
                                                    <span class="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                                                        ${ev}
                                                    </span>
                                                `).join("")}
                                            </div>
                                            <div class="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                                                <span>Secret: <span class="font-mono text-slate-400">${sub.secret.slice(0, 10)}••••••••</span></span>
                                                <span>•</span>
                                                <span>Deliveries: <strong class="text-slate-300">${sub.metrics?.total || 0}</strong> (<span class="text-emerald-400">${sub.metrics?.success || 0} ok</span>, <span class="text-rose-400">${sub.metrics?.failed || 0} failed</span>)</span>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                                            <button class="test-webhook-btn px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition flex items-center gap-1.5" data-id="${sub.id}">
                                                <i data-lucide="zap" class="w-3.5 h-3.5"></i> Test Ping
                                            </button>
                                            <button class="edit-webhook-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5" data-id="${sub.id}">
                                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit
                                            </button>
                                            <button class="delete-webhook-btn px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1.5" data-id="${sub.id}">
                                                <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        `}
                    </div>

                    <!-- Recent Webhook Deliveries Table -->
                    <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-bold text-white flex items-center gap-2">
                                <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i> Recent Webhook Delivery Logs
                            </h3>
                            <span class="text-xs text-slate-400">Last ${deliveries.length} attempts</span>
                        </div>

                        ${deliveries.length === 0 ? `
                            <div class="py-8 text-center text-xs text-slate-500">No webhook delivery logs recorded yet.</div>
                        ` : `
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300">
                                    <thead class="text-[11px] uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700">
                                        <tr>
                                            <th class="p-3">Status</th>
                                            <th class="p-3">Event</th>
                                            <th class="p-3">Destination URL</th>
                                            <th class="p-3">HTTP Code</th>
                                            <th class="p-3">Latency</th>
                                            <th class="p-3">Timestamp</th>
                                            <th class="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-700/50">
                                        ${deliveries.map(d => `
                                            <tr class="hover:bg-slate-700/30 transition">
                                                <td class="p-3">
                                                    ${d.is_success ? `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Success
                                                        </span>
                                                    ` : `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                                                            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Failed
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="p-3 font-mono font-bold text-indigo-300">${d.event_name}</td>
                                                <td class="p-3 font-mono text-slate-400 max-w-[200px] truncate" title="${d.url}">${d.url}</td>
                                                <td class="p-3 font-mono">${d.status_code || '<span class="text-rose-400">ERR</span>'}</td>
                                                <td class="p-3 font-mono text-slate-400">${d.latency_ms}ms</td>
                                                <td class="p-3 text-slate-400">${d.created_at}</td>
                                                <td class="p-3 text-right space-x-2">
                                                    <button class="inspect-payload-btn px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition" data-delivery-id="${d.id}">
                                                        Inspect
                                                    </button>
                                                    <button class="resend-webhook-btn px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-[11px] font-semibold transition" data-delivery-id="${d.id}">
                                                        Retry
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            // Bind events for buttons
            const openAddModal = () => this.openWebhookModal();
            const addBtn = container.querySelector("#add-webhook-btn");
            if (addBtn) addBtn.addEventListener("click", openAddModal);
            const emptyBtn = container.querySelector("#add-webhook-empty-btn");
            if (emptyBtn) emptyBtn.addEventListener("click", openAddModal);

            const quickDemoBtn = container.querySelector("#quick-demo-webhook-btn");
            if (quickDemoBtn) {
                quickDemoBtn.addEventListener("click", async () => {
                    try {
                        const localUrl = `${window.location.origin}/api/webhooks/test-receiver`;
                        await window.api.createWebhookSubscription({
                            url: localUrl,
                            description: "Built-in NovaDrop Sandbox Webhook Receiver",
                            events: ["*"],
                            is_active: true
                        });
                        window.showToast("Sandbox receiver webhook registered!", "success");
                        this.renderWebhooksTab(container);
                    } catch (e) {
                        window.showToast(e.message, "error");
                    }
                });
            }

            // Test Ping buttons
            container.querySelectorAll(".test-webhook-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    btn.disabled = true;
                    btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Ping...`;
                    if (window.lucide) window.lucide.createIcons();
                    try {
                        const res = await window.api.testWebhookSubscription(id);
                        if (res.status === "delivered") {
                            window.showToast(`Test ping succeeded (${res.details.latency_ms}ms, HTTP ${res.details.status_code})`, "success");
                        } else {
                            window.showToast(`Test ping failed: ${res.details.error_message || 'HTTP error'}`, "warning");
                        }
                        this.renderWebhooksTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                        btn.disabled = false;
                        btn.innerHTML = `<i data-lucide="zap" class="w-3.5 h-3.5"></i> Test Ping`;
                        if (window.lucide) window.lucide.createIcons();
                    }
                });
            });

            // Edit buttons
            container.querySelectorAll(".edit-webhook-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = parseInt(btn.getAttribute("data-id"));
                    const sub = subscriptions.find(s => s.id === id);
                    if (sub) this.openWebhookModal(sub);
                });
            });

            // Delete buttons
            container.querySelectorAll(".delete-webhook-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Are you sure you want to delete this webhook subscription? All delivery history will be removed.")) return;
                    const id = btn.getAttribute("data-id");
                    try {
                        await window.api.deleteWebhookSubscription(id);
                        window.showToast("Webhook subscription removed.", "success");
                        this.renderWebhooksTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                    }
                });
            });

            // Inspect Payload buttons
            container.querySelectorAll(".inspect-payload-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = parseInt(btn.getAttribute("data-delivery-id"));
                    const delivery = deliveries.find(d => d.id === id);
                    if (delivery) this.openInspectPayloadModal(delivery);
                });
            });

            // Retry delivery buttons
            container.querySelectorAll(".resend-webhook-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-delivery-id");
                    try {
                        await window.api.resendWebhookDelivery(id);
                        window.showToast("Webhook re-delivery triggered.", "success");
                        this.renderWebhooksTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                    }
                });
            });

        } catch (err) {
            container.innerHTML = `
                <div class="p-8 text-center bg-slate-800/80 rounded-2xl border border-rose-500/30 space-y-3">
                    <i data-lucide="alert-triangle" class="w-8 h-8 text-rose-400 mx-auto"></i>
                    <h3 class="text-sm font-bold text-white">Failed to load webhooks</h3>
                    <p class="text-xs text-rose-300">${err.message}</p>
                    <button onclick="window.AdminDashboardView.renderWebhooksTab(document.getElementById('admin-tab-workspace'))" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
                        Retry
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    openWebhookModal(sub = null) {
        const isEdit = !!sub;
        let modal = document.getElementById("admin-webhook-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "admin-webhook-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop";
            document.body.appendChild(modal);
        }

        const eventsList = [
            { id: "all", label: "* (All Events)", desc: "Receive all platform event dispatches" },
            { id: "order.created", label: "order.created", desc: "Buyer completes checkout" },
            { id: "order.paid", label: "order.paid", desc: "Payment successfully authorized & captured" },
            { id: "order.fulfilled", label: "order.fulfilled", desc: "Fulfillment created & carrier tracking assigned" },
            { id: "order.cancelled", label: "order.cancelled", desc: "Order cancelled & stock restored" },
            { id: "tracking.updated", label: "tracking.updated", desc: "Carrier checkpoint or milestone status logged" },
            { id: "inventory.low_stock", label: "inventory.low_stock", desc: "Product inventory falls below threshold" },
            { id: "refund.requested", label: "refund.requested", desc: "Customer submits refund or dispute" }
        ];

        const selectedEvents = sub ? (sub.events || ["*"]) : ["*"];
        const defaultSecret = sub ? sub.secret : `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

        modal.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl space-y-0">
                <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <i data-lucide="webhook" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">${isEdit ? 'Edit Webhook Endpoint' : 'Register Webhook Endpoint'}</h3>
                            <p class="text-[11px] text-slate-400">Configure destination URL and event trigger filter</p>
                        </div>
                    </div>
                    <button class="close-modal-btn text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label class="block text-xs text-slate-300 font-semibold mb-1">Target Payload URL *</label>
                        <input type="url" id="wh-form-url" value="${sub ? sub.url : ''}" placeholder="https://api.yourdomain.com/webhooks/novadrop" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none">
                        <span class="text-[11px] text-slate-500 mt-1 block">Must start with http:// or https://</span>
                    </div>

                    <div>
                        <label class="block text-xs text-slate-300 font-semibold mb-1">Description / Label</label>
                        <input type="text" id="wh-form-desc" value="${sub ? (sub.description || '') : ''}" placeholder="e.g. ERP System / Discord Notifications / Warehouse API" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none">
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-xs text-slate-300 font-semibold">HMAC Signing Secret</label>
                            <button type="button" id="wh-gen-secret-btn" class="text-[11px] text-indigo-400 hover:text-indigo-300">Generate New Secret</button>
                        </div>
                        <input type="text" id="wh-form-secret" value="${defaultSecret}" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none">
                        <span class="text-[11px] text-slate-500 mt-1 block">Used to compute the HMAC-SHA256 signature in the <code class="text-indigo-300">X-NovaDrop-Signature</code> header.</span>
                    </div>

                    <div>
                        <label class="block text-xs text-slate-300 font-semibold mb-2">Subscribed Event Triggers</label>
                        <div class="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                            ${eventsList.map(ev => {
                                const checked = selectedEvents.includes("*") || selectedEvents.includes(ev.id) || (ev.id === 'all' && selectedEvents.includes("*"));
                                return `
                                    <label class="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white">
                                        <input type="checkbox" name="wh-events" value="${ev.id === 'all' ? '*' : ev.id}" ${checked ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
                                        <div>
                                            <span class="font-mono font-bold text-indigo-300">${ev.label}</span>
                                            <span class="text-[11px] text-slate-400 ml-1.5">— ${ev.desc}</span>
                                        </div>
                                    </label>
                                `;
                            }).join("")}
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="wh-form-active" ${sub ? (sub.is_active ? 'checked' : '') : 'checked'} class="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
                        <label for="wh-form-active" class="text-xs text-slate-300 font-semibold cursor-pointer">Endpoint is active and receiving live dispatches</label>
                    </div>
                </div>

                <div class="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/90">
                    <button class="close-modal-btn text-xs text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button id="save-webhook-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md">
                        ${isEdit ? 'Save Webhook Changes' : 'Register Webhook'}
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        const close = () => modal.classList.add("hidden");
        modal.querySelectorAll(".close-modal-btn").forEach(b => b.addEventListener("click", close));

        modal.querySelector("#wh-gen-secret-btn").addEventListener("click", () => {
            modal.querySelector("#wh-form-secret").value = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        });

        modal.querySelector("#save-webhook-btn").addEventListener("click", async () => {
            const url = modal.querySelector("#wh-form-url").value.trim();
            if (!url) {
                window.showToast("Target URL is required.", "warning");
                return;
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                window.showToast("URL must start with http:// or https://", "warning");
                return;
            }

            const checkedBoxes = Array.from(modal.querySelectorAll("input[name='wh-events']:checked")).map(cb => cb.value);
            const events = checkedBoxes.includes("*") ? ["*"] : (checkedBoxes.length > 0 ? checkedBoxes : ["*"]);

            const payload = {
                url: url,
                description: modal.querySelector("#wh-form-desc").value.trim(),
                secret: modal.querySelector("#wh-form-secret").value.trim(),
                events: events,
                is_active: modal.querySelector("#wh-form-active").checked
            };

            try {
                if (isEdit) {
                    await window.api.updateWebhookSubscription(sub.id, payload);
                    window.showToast("Webhook subscription updated!", "success");
                } else {
                    await window.api.createWebhookSubscription(payload);
                    window.showToast("Webhook subscription created successfully!", "success");
                }
                close();
                this.renderWebhooksTab(document.getElementById("admin-tab-workspace"));
            } catch (err) {
                window.showToast(err.message, "error");
            }
        });
    },

    openInspectPayloadModal(delivery) {
        let modal = document.getElementById("admin-inspect-delivery-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "admin-inspect-delivery-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop";
            document.body.appendChild(modal);
        }

        let formattedPayload = "";
        try {
            formattedPayload = JSON.stringify(JSON.parse(delivery.payload_json), null, 2);
        } catch (e) {
            formattedPayload = delivery.payload_json;
        }

        modal.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-0">
                <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg ${delivery.is_success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} flex items-center justify-center">
                            <i data-lucide="${delivery.is_success ? 'check-circle-2' : 'alert-circle'}" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Delivery #${delivery.id} — <span class="font-mono text-indigo-300">${delivery.event_name}</span></h3>
                            <p class="text-[11px] text-slate-400">${delivery.created_at} • ${delivery.latency_ms}ms latency</p>
                        </div>
                    </div>
                    <button class="close-modal-btn text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                            <div class="text-slate-400 text-[11px]">HTTP Status</div>
                            <div class="text-sm font-bold ${delivery.is_success ? 'text-emerald-400' : 'text-rose-400'} mt-0.5">
                                ${delivery.status_code || 'Network Error / Timeout'}
                            </div>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                            <div class="text-slate-400 text-[11px]">Delivery Result</div>
                            <div class="text-sm font-bold text-white mt-0.5">
                                ${delivery.is_success ? 'Delivered (2xx OK)' : 'Delivery Failed'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="text-xs font-bold text-slate-300 mb-1">Destination URL</div>
                        <code class="block p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 break-all">${delivery.url}</code>
                    </div>

                    ${delivery.error_message ? `
                        <div>
                            <div class="text-xs font-bold text-rose-400 mb-1">Error Message</div>
                            <code class="block p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs font-mono text-rose-300">${delivery.error_message}</code>
                        </div>
                    ` : ''}

                    <div>
                        <div class="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                            <span>Dispatched Payload Envelope</span>
                            <span class="text-[11px] text-slate-500 font-normal">JSON</span>
                        </div>
                        <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 scrollbar-none">${formattedPayload}</pre>
                    </div>

                    ${delivery.response_body ? `
                        <div>
                            <div class="text-xs font-bold text-slate-300 mb-1">Receiver Response Body</div>
                            <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36 scrollbar-none">${delivery.response_body}</pre>
                        </div>
                    ` : ''}
                </div>

                <div class="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/90">
                    <button class="close-modal-btn text-xs text-slate-400 hover:text-white px-4 py-2">Close</button>
                    <button id="modal-retry-delivery-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5">
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i> Retry Delivery
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        const close = () => modal.classList.add("hidden");
        modal.querySelectorAll(".close-modal-btn").forEach(b => b.addEventListener("click", close));

        modal.querySelector("#modal-retry-delivery-btn").addEventListener("click", async () => {
            try {
                await window.api.resendWebhookDelivery(delivery.id);
                window.showToast("Webhook re-delivery initiated.", "success");
                close();
                this.renderWebhooksTab(document.getElementById("admin-tab-workspace"));
            } catch (err) {
                window.showToast(err.message, "error");
            }
        });
    },

    // -------------------------------------------------------------
    // MODALS: ADD/EDIT PRODUCT & BULK MARKUP
    // -------------------------------------------------------------
    openProductFormModal(product, categories, suppliers) {
        let modal = document.getElementById("admin-product-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "admin-product-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop";
            document.body.appendChild(modal);
        }

        const isEdit = !!product;
        const p = product || {
            title: "", category_id: categories[0]?.id || 1, supplier_id: suppliers[0]?.id || 1,
            cost_price: 20.0, retail_price: 49.99, compare_at_price: 79.99,
            sku: "NOVA-SKU-" + Math.floor(1000 + Math.random() * 9000), stock_quantity: 100,
            short_description: "", description: "", tags: "Trending, Best Seller",
            images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
            variants: []
        };

        modal.innerHTML = `
            <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
                <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="package-plus" class="w-5 h-5 text-indigo-400"></i> ${isEdit ? 'Edit Product SKU' : 'Create New Dropship Product'}
                    </h3>
                    <button class="close-modal-btn text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="overflow-y-auto p-6 space-y-4 flex-1">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Product Title *</label>
                        <input type="text" id="form-prod-title" value="${p.title}" placeholder="e.g. Titanium EDC Multi-Tool" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Category *</label>
                            <select id="form-prod-cat" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                                ${categories.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Supplier Warehouse *</label>
                            <select id="form-prod-sup" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                                ${suppliers.map(s => `<option value="${s.id}" ${p.supplier_id === s.id ? 'selected' : ''}>${s.name} (${s.shipping_origin.split(',')[0]})</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Wholesale Cost ($) *</label>
                            <input type="number" id="form-prod-cost" step="0.01" value="${p.cost_price}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white">
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Selling Retail ($) *</label>
                            <input type="number" id="form-prod-retail" step="0.01" value="${p.retail_price}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white font-bold">
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">MSRP Strikeout ($)</label>
                            <input type="number" id="form-prod-compare" step="0.01" value="${p.compare_at_price || ''}" placeholder="e.g. 79.99" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">SKU Code *</label>
                            <input type="text" id="form-prod-sku" value="${p.sku}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white uppercase">
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Stock Quantity *</label>
                            <input type="number" id="form-prod-stock" value="${p.stock_quantity}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Image URL</label>
                        <input type="text" id="form-prod-image" value="${p.primary_image || (p.images && p.images[0]) || ''}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Short Feature Summary</label>
                        <input type="text" id="form-prod-short-desc" value="${p.short_description || ''}" placeholder="e.g. Aerospace grade titanium with quick-release carabiner." class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Full Detailed HTML Description</label>
                        <textarea id="form-prod-desc" rows="4" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">${p.description || ''}</textarea>
                    </div>
                </div>

                <div class="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/90">
                    <button class="close-modal-btn text-xs text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button id="save-product-form-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md">
                        ${isEdit ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        const close = () => modal.classList.add("hidden");
        modal.querySelectorAll(".close-modal-btn").forEach(b => b.addEventListener("click", close));

        modal.querySelector("#save-product-form-btn").addEventListener("click", async () => {
            const payload = {
                title: modal.querySelector("#form-prod-title").value.trim(),
                category_id: parseInt(modal.querySelector("#form-prod-cat").value),
                supplier_id: parseInt(modal.querySelector("#form-prod-sup").value),
                cost_price: parseFloat(modal.querySelector("#form-prod-cost").value),
                retail_price: parseFloat(modal.querySelector("#form-prod-retail").value),
                compare_at_price: parseFloat(modal.querySelector("#form-prod-compare").value) || null,
                sku: modal.querySelector("#form-prod-sku").value.trim().toUpperCase(),
                stock_quantity: parseInt(modal.querySelector("#form-prod-stock").value),
                short_description: modal.querySelector("#form-prod-short-desc").value.trim(),
                description: modal.querySelector("#form-prod-desc").value.trim(),
                images: [modal.querySelector("#form-prod-image").value.trim() || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]
            };

            if (!payload.title || !payload.sku) {
                window.showToast("Title and SKU are required.", "warning");
                return;
            }

            try {
                if (isEdit) {
                    await window.api.updateProduct(p.id, payload);
                    window.showToast("Product updated successfully!", "success");
                } else {
                    await window.api.createProduct(payload);
                    window.showToast("Product created and added to catalog!", "success");
                }
                close();
                this.renderProductsTab(document.getElementById("admin-tab-workspace"));
            } catch (err) {
                window.showToast(err.message, "error");
            }
        });
    },

    openBulkMarkupModal() {
        const markupType = prompt("Choose markup formula: 'multiplier' (e.g. 2.5x cost) or 'percentage' (e.g. 40% margin):", "multiplier");
        if (!markupType) return;
        const val = prompt("Enter value (e.g. 2.5 for 2.5x multiplier, or 40 for 40% markup):", "2.5");
        if (!val) return;

        window.api.applyBulkMarkup({
            markup_type: markupType,
            markup_value: parseFloat(val),
            rounding_format: "99"
        }).then(res => {
            window.showToast(res.message, "success");
            this.render(document.getElementById("view-container"));
        }).catch(err => window.showToast(err.message, "error"));
    }
};
