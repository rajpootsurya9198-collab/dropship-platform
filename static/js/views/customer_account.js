// Customer Account Management Portal View

window.CustomerAccountView = {
    activeTab: "orders", // orders, addresses, wishlist, reviews, profile
    orders: [],
    addresses: [],
    wishlist: [],
    reviews: [],
    loading: false,

    async render(container) {
        const user = window.appState.user;
        if (!user) {
            container.innerHTML = `
                <div class="max-w-md mx-auto py-20 px-4 text-center space-y-6">
                    <div class="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <i data-lucide="lock" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-2xl font-black text-white">Customer Sign In Required</h2>
                    <p class="text-sm text-slate-400">Please sign in to view your orders, live trackings, saved addresses, and returns.</p>
                    <button onclick="window.AuthModal.open()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition">
                        Sign In / Register
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="max-w-6xl mx-auto px-4 py-8 space-y-8">
                <!-- User Banner -->
                <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}"
                             class="w-16 h-16 rounded-2xl object-cover bg-slate-900 border-2 border-indigo-500/50 shadow-md">
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-xl sm:text-2xl font-black text-white">${user.full_name}</h1>
                                <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                                    ${user.role.toUpperCase()}
                                </span>
                            </div>
                            <div class="text-xs text-slate-400 mt-0.5">${user.email} • ${user.phone || 'No phone set'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${user.role === 'admin' || user.role === 'merchant' || user.role === 'supplier' ? `
                            <a href="#admin" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5">
                                <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Switch to Management Hub
                            </a>
                        ` : ''}
                        <button id="account-logout-btn" class="bg-slate-700/80 hover:bg-rose-900/60 hover:text-rose-300 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5">
                            <i data-lucide="log-out" class="w-4 h-4"></i> Log Out
                        </button>
                    </div>
                </div>

                <!-- Account Navigation Tabs -->
                <div class="flex border-b border-slate-800 gap-2 sm:gap-6 overflow-x-auto pb-1 scrollbar-none">
                    <button class="acc-tab-btn ${this.activeTab === 'orders' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="orders">
                        <i data-lucide="package" class="w-4 h-4"></i> My Orders
                    </button>
                    <button class="acc-tab-btn ${this.activeTab === 'addresses' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="addresses">
                        <i data-lucide="map-pin" class="w-4 h-4"></i> Saved Addresses
                    </button>
                    <button class="acc-tab-btn ${this.activeTab === 'wishlist' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="wishlist">
                        <i data-lucide="heart" class="w-4 h-4"></i> Saved Wishlist
                    </button>
                    <button class="acc-tab-btn ${this.activeTab === 'reviews' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="reviews">
                        <i data-lucide="star" class="w-4 h-4"></i> My Reviews
                    </button>
                    <button class="acc-tab-btn ${this.activeTab === 'profile' ? 'active text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-slate-400 hover:text-white font-semibold'} pb-3 text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2" data-tab="profile">
                        <i data-lucide="user" class="w-4 h-4"></i> Profile Settings
                    </button>
                </div>

                <!-- Tab Content Container -->
                <div id="account-tab-content" class="min-h-[300px]">
                    <!-- Dynamic tab rendered here -->
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.bindEvents(container);
        await this.loadTabContent();
    },

    bindEvents(container) {
        // Tab switching
        container.querySelectorAll(".acc-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeTab = btn.getAttribute("data-tab");
                this.render(container);
            });
        });

        // Logout
        const logoutBtn = container.querySelector("#account-logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                window.appState.logout();
                window.showToast("Logged out successfully.", "info");
                this.render(container);
            });
        }
    },

    async loadTabContent() {
        const content = document.getElementById("account-tab-content");
        if (!content) return;

        if (this.activeTab === "orders") {
            await this.renderOrdersTab(content);
        } else if (this.activeTab === "addresses") {
            await this.renderAddressesTab(content);
        } else if (this.activeTab === "wishlist") {
            await this.renderWishlistTab(content);
        } else if (this.activeTab === "reviews") {
            await this.renderReviewsTab(content);
        } else if (this.activeTab === "profile") {
            this.renderProfileTab(content);
        }
    },

    async renderOrdersTab(container) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs">Loading orders history...</span>
            </div>
        `;

        try {
            const res = await window.api.getMyOrders();
            this.orders = res.orders || [];

            if (this.orders.length === 0) {
                container.innerHTML = `
                    <div class="p-12 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-4">
                        <div class="w-14 h-14 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                            <i data-lucide="package-open" class="w-7 h-7"></i>
                        </div>
                        <h3 class="text-base font-bold text-white">No Orders Placed Yet</h3>
                        <p class="text-xs text-slate-400 max-w-sm mx-auto">Start browsing our catalog to make your first order.</p>
                        <a href="#store" class="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">
                            Browse Trending Products
                        </a>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            container.innerHTML = `
                <div class="space-y-6">
                    ${this.orders.map(o => `
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <!-- Order Header -->
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-base font-black text-white font-mono">#${o.order_number}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${this.getStatusBadgeClass(o.order_status)}">
                                            ${o.order_status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div class="text-xs text-slate-400 mt-1">Placed on ${o.created_at} • Total: <strong class="text-white">$${o.total_amount.toFixed(2)}</strong></div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <a href="#tracking?order=${o.order_number}" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md">
                                        <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> Track Order
                                    </a>
                                    ${o.order_status === 'pending' || o.order_status === 'processing' ? `
                                        <button class="cancel-order-btn px-3 py-2 rounded-xl bg-slate-700 hover:bg-rose-900/60 hover:text-rose-300 text-slate-300 text-xs font-bold transition"
                                                data-num="${o.order_number}">
                                            Cancel Order
                                        </button>
                                    ` : ''}
                                    ${o.order_status === 'delivered' || o.order_status === 'shipped' ? `
                                        <button class="refund-order-btn px-3 py-2 rounded-xl bg-slate-700 hover:bg-amber-900/60 hover:text-amber-300 text-slate-300 text-xs font-bold transition"
                                                data-num="${o.order_number}" data-amt="${o.total_amount}">
                                            Return / Refund
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Order Items -->
                            <div class="space-y-3">
                                ${o.items.map(it => `
                                    <div class="flex items-center justify-between gap-3 text-xs">
                                        <div class="flex items-center gap-3">
                                            <img src="${it.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}" class="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-700">
                                            <div>
                                                <div class="text-sm font-bold text-white">${it.title}</div>
                                                ${it.variant_title ? `<div class="text-xs text-indigo-400 font-semibold">${it.variant_title}</div>` : ''}
                                                <div class="text-[11px] text-slate-400">Qty: ${it.quantity} • Unit: $${it.unit_price.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <div class="font-bold text-white text-sm">$${(it.unit_price * it.quantity).toFixed(2)}</div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Fulfillments Tracker Bar -->
                            ${o.fulfillments && o.fulfillments.length > 0 ? `
                                <div class="pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                    <span class="font-bold text-slate-300 flex items-center gap-1"><i data-lucide="truck" class="w-3.5 h-3.5 text-cyan-400"></i> Dispatched Via:</span>
                                    ${o.fulfillments.map(f => `
                                        <span class="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-indigo-300 font-mono">
                                            ${f.carrier}: <strong>${f.tracking_number}</strong> (${f.status})
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}

                            <!-- Dispute status notice if any -->
                            ${o.dispute ? `
                                <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center justify-between">
                                    <span><strong>Dispute/Refund Status:</strong> ${o.dispute.status.toUpperCase()} (${o.dispute.reason})</span>
                                    <span class="font-mono">$${o.dispute.requested_amount.toFixed(2)} requested</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            this.bindOrdersEvents(container);
        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs text-center py-8">Failed to load orders: ${err.message}</div>`;
        }
    },

    bindOrdersEvents(container) {
        // Cancel Order
        container.querySelectorAll(".cancel-order-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const orderNum = btn.getAttribute("data-num");
                const reason = prompt(`Please specify a reason for cancelling order #${orderNum}:`, "Changed my mind before dispatch.");
                if (!reason) return;

                try {
                    btn.disabled = true;
                    btn.textContent = "Cancelling...";
                    const res = await window.api.cancelOrder(orderNum, reason);
                    window.showToast(res.message, "success");
                    await this.renderOrdersTab(container);
                } catch (err) {
                    window.showToast(err.message, "error");
                    btn.disabled = false;
                    btn.textContent = "Cancel Order";
                }
            });
        });

        // Request Refund
        container.querySelectorAll(".refund-order-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const orderNum = btn.getAttribute("data-num");
                const maxAmt = btn.getAttribute("data-amt");
                const reason = prompt(`Reason for refund request for order #${orderNum} (e.g. Damaged in transit, Defective unit, Missing parts):`, "Item arrived damaged during shipping.");
                if (!reason) return;

                const details = prompt("Please provide additional explanation:", "Package outer shell was dented and item won't turn on.");
                if (!details) return;

                try {
                    btn.disabled = true;
                    btn.textContent = "Submitting...";
                    const res = await window.api.requestRefund(orderNum, {
                        reason,
                        details,
                        requested_amount: parseFloat(maxAmt)
                    });
                    window.showToast(res.message, "success");
                    await this.renderOrdersTab(container);
                } catch (err) {
                    window.showToast(err.message, "error");
                    btn.disabled = false;
                    btn.textContent = "Return / Refund";
                }
            });
        });
    },

    async renderAddressesTab(container) {
        try {
            const res = await window.api.getAddresses();
            this.addresses = res.addresses || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-white">Your Saved Shipping Addresses</h3>
                        <button id="add-new-addr-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Address
                        </button>
                    </div>

                    <!-- New Address Form (Hidden initially) -->
                    <div id="new-address-form-box" class="hidden p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-4">
                        <h4 class="text-sm font-bold text-white">Add New Delivery Address</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Address Label (Home, Office, etc.)</label>
                                <input type="text" id="new-addr-title" placeholder="Home" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Full Name</label>
                                <input type="text" id="new-addr-name" placeholder="Sophia Martinez" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-xs text-slate-400 mb-1">Street Address</label>
                                <input type="text" id="new-addr-street" placeholder="742 Evergreen Terrace" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Apt / Suite</label>
                                <input type="text" id="new-addr-apt" placeholder="Apt 4B" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">City</label>
                                <input type="text" id="new-addr-city" placeholder="Austin" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">State</label>
                                <input type="text" id="new-addr-state" placeholder="TX" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Postal Code</label>
                                <input type="text" id="new-addr-postal" placeholder="78701" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-2">
                            <button id="cancel-new-addr-btn" class="text-xs text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                            <button id="save-new-addr-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-lg transition">Save Address</button>
                        </div>
                    </div>

                    <!-- Addresses Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        ${this.addresses.map(a => `
                            <div class="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 relative shadow-sm">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-bold text-white flex items-center gap-1.5">
                                        <i data-lucide="home" class="w-4 h-4 text-indigo-400"></i> ${a.title}
                                        ${a.is_default ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Default</span>' : ''}
                                    </span>
                                    <div class="flex items-center gap-2">
                                        ${!a.is_default ? `
                                            <button class="set-default-addr-btn text-[11px] text-indigo-400 hover:underline" data-id="${a.id}">Set Default</button>
                                        ` : ''}
                                        <button class="del-addr-btn text-slate-400 hover:text-rose-400 p-1" data-id="${a.id}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </div>
                                <div class="text-xs font-semibold text-slate-200">${a.full_name}</div>
                                <div class="text-xs text-slate-400">${a.street_address} ${a.apt_suite || ''}</div>
                                <div class="text-xs text-slate-400">${a.city}, ${a.state} ${a.postal_code}, ${a.country}</div>
                                <div class="text-[11px] text-slate-500">${a.phone || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            // Bind address actions
            const addBtn = container.querySelector("#add-new-addr-btn");
            const formBox = container.querySelector("#new-address-form-box");
            const cancelBtn = container.querySelector("#cancel-new-addr-btn");
            const saveBtn = container.querySelector("#save-new-addr-btn");

            if (addBtn && formBox) {
                addBtn.addEventListener("click", () => formBox.classList.toggle("hidden"));
                cancelBtn.addEventListener("click", () => formBox.classList.add("hidden"));
                saveBtn.addEventListener("click", async () => {
                    const payload = {
                        title: container.querySelector("#new-addr-title").value.trim() || "Home",
                        full_name: container.querySelector("#new-addr-name").value.trim(),
                        street_address: container.querySelector("#new-addr-street").value.trim(),
                        apt_suite: container.querySelector("#new-addr-apt").value.trim(),
                        city: container.querySelector("#new-addr-city").value.trim(),
                        state: container.querySelector("#new-addr-state").value.trim(),
                        postal_code: container.querySelector("#new-addr-postal").value.trim()
                    };
                    if (!payload.full_name || !payload.street_address || !payload.city || !payload.state || !payload.postal_code) {
                        window.showToast("Please fill in all required address fields.", "warning");
                        return;
                    }
                    try {
                        await window.api.createAddress(payload);
                        window.showToast("Address saved successfully!", "success");
                        await this.renderAddressesTab(container);
                    } catch (err) {
                        window.showToast(err.message, "error");
                    }
                });
            }

            container.querySelectorAll(".set-default-addr-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    await window.api.setDefaultAddress(id);
                    window.showToast("Default address updated.", "success");
                    await this.renderAddressesTab(container);
                });
            });

            container.querySelectorAll(".del-addr-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    if (confirm("Delete this saved address?")) {
                        await window.api.deleteAddress(id);
                        window.showToast("Address deleted.", "info");
                        await this.renderAddressesTab(container);
                    }
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load addresses: ${err.message}</div>`;
        }
    },

    async renderWishlistTab(container) {
        try {
            const res = await window.api.getWishlist();
            this.wishlist = res.wishlist || [];

            if (this.wishlist.length === 0) {
                container.innerHTML = `
                    <div class="p-12 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-4">
                        <div class="w-14 h-14 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                            <i data-lucide="heart" class="w-7 h-7"></i>
                        </div>
                        <h3 class="text-base font-bold text-white">Your Wishlist is Empty</h3>
                        <p class="text-xs text-slate-400 max-w-sm mx-auto">Click the heart icon on any product to save it for later.</p>
                        <a href="#store" class="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">
                            Explore Products
                        </a>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            container.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${this.wishlist.map(p => `
                        <div class="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                            <img src="${p.primary_image}" class="w-full aspect-[4/3] rounded-xl object-cover bg-slate-900">
                            <div>
                                <div class="text-xs text-indigo-400 font-semibold">${p.category_name}</div>
                                <h4 class="text-sm font-bold text-white line-clamp-1">${p.title}</h4>
                                <div class="text-base font-black text-white mt-1">$${p.retail_price.toFixed(2)}</div>
                            </div>
                            <div class="flex items-center gap-2 pt-2 border-t border-slate-700">
                                <button class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl transition" onclick="window.location.hash='#product/${p.slug}'">
                                    View & Buy
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load wishlist: ${err.message}</div>`;
        }
    },

    async renderReviewsTab(container) {
        try {
            const res = await window.api.request("/customer/reviews");
            const reviews = res.reviews || [];

            if (reviews.length === 0) {
                container.innerHTML = `
                    <div class="p-12 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-4">
                        <div class="w-14 h-14 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                            <i data-lucide="star" class="w-7 h-7"></i>
                        </div>
                        <h3 class="text-base font-bold text-white">No Reviews Written Yet</h3>
                        <p class="text-xs text-slate-400">Your submitted product ratings and feedback will appear here.</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            container.innerHTML = `
                <div class="space-y-4">
                    ${reviews.map(r => `
                        <div class="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="text-sm font-bold text-white hover:text-indigo-400 cursor-pointer" onclick="window.location.hash='#product/${r.product_slug}'">
                                    ${r.product_title}
                                </div>
                                <div class="text-amber-400 text-xs font-bold">${'★'.repeat(r.rating)}</div>
                            </div>
                            <div class="text-xs font-bold text-slate-200">${r.title}</div>
                            <p class="text-xs text-slate-300 leading-relaxed">${r.comment}</p>
                            <div class="text-[10px] text-slate-500 pt-1">${r.created_at}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            container.innerHTML = `<div class="text-rose-400 text-xs">Failed to load reviews: ${err.message}</div>`;
        }
    },

    renderProfileTab(container) {
        const user = window.appState.user;
        container.innerHTML = `
            <div class="max-w-xl p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 shadow-sm">
                <h3 class="text-sm font-bold text-white border-b border-slate-700 pb-3">Personal Profile Information</h3>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Full Name</label>
                        <input type="text" id="prof-name" value="${user.full_name}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Email Address</label>
                        <input type="email" value="${user.email}" disabled class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-not-allowed">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Phone Number</label>
                        <input type="text" id="prof-phone" value="${user.phone || ''}" placeholder="+1 (555) 000-0000" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    </div>
                    <button id="save-profile-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-md">
                        Update Profile
                    </button>
                </div>
            </div>
        `;

        const saveBtn = container.querySelector("#save-profile-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", async () => {
                const name = container.querySelector("#prof-name").value.trim();
                const phone = container.querySelector("#prof-phone").value.trim();
                try {
                    const res = await window.api.updateProfile({ full_name: name, phone });
                    window.appState.setUser(res.user, window.appState.token);
                    window.showToast("Profile updated successfully!", "success");
                    this.render(container.parentElement);
                } catch (err) {
                    window.showToast(err.message, "error");
                }
            });
        }
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case "delivered": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
            case "shipped": return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
            case "processing": return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
            case "cancelled": return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
            case "disputed": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
            default: return "bg-slate-700 text-slate-300";
        }
    }
};
