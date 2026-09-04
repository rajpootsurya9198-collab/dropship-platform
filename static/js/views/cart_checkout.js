// Cart & Multi-Step Checkout Flow View

window.CartCheckoutView = {
    step: "cart", // cart, checkout, success
    shippingMethod: "standard",
    appliedCoupon: null,
    discountAmount: 0.0,
    shippingFee: 4.99,
    taxAmount: 0.0,
    savedAddresses: [],
    selectedAddressId: null,
    lastOrder: null,

    async render(container) {
        if (window.location.hash === "#checkout") {
            this.step = "checkout";
        } else {
            this.step = "cart";
        }

        if (this.step === "checkout" && window.appState.cart.length === 0) {
            window.showToast("Your cart is empty. Please add items to checkout.", "info");
            this.step = "cart";
            window.location.hash = "#cart";
        }

        if (window.appState.user) {
            try {
                const res = await window.api.getAddresses();
                this.savedAddresses = res.addresses || [];
                const defaultAddr = this.savedAddresses.find(a => a.is_default);
                if (defaultAddr) this.selectedAddressId = defaultAddr.id;
                else if (this.savedAddresses.length > 0) this.selectedAddressId = this.savedAddresses[0].id;
            } catch (e) {
                console.error("Failed to load saved addresses:", e);
            }
        }

        this.calculateTotals();

        if (this.step === "success" && this.lastOrder) {
            this.renderSuccessView(container);
        } else if (this.step === "checkout") {
            this.renderCheckoutView(container);
        } else {
            this.renderCartView(container);
        }
    },

    calculateTotals() {
        const subtotal = window.appState.getCartSubtotal();
        if (subtotal >= 50.0 && this.shippingMethod === "standard") {
            this.shippingFee = 0.0;
        } else if (this.shippingMethod === "express") {
            this.shippingFee = 14.99;
        } else {
            this.shippingFee = 4.99;
        }

        if (this.appliedCoupon) {
            if (this.appliedCoupon.discount_type === "percentage") {
                this.discountAmount = subtotal * (this.appliedCoupon.discount_value / 100.0);
                if (this.appliedCoupon.max_discount_amount && this.discountAmount > this.appliedCoupon.max_discount_amount) {
                    this.discountAmount = this.appliedCoupon.max_discount_amount;
                }
            } else {
                this.discountAmount = Math.min(this.appliedCoupon.discount_value, subtotal);
            }
            this.discountAmount = Math.round(this.discountAmount * 100) / 100;
        } else {
            this.discountAmount = 0.0;
        }

        const taxable = Math.max(0, subtotal - this.discountAmount);
        this.taxAmount = Math.round(taxable * 0.08 * 100) / 100;
        this.totalAmount = Math.round((taxable + this.shippingFee + this.taxAmount) * 100) / 100;
    },

    renderCartView(container) {
        const cart = window.appState.cart;
        const subtotal = window.appState.getCartSubtotal();
        const freeShippingDiff = Math.max(0, 50.0 - subtotal);
        const freeShippingPct = Math.min(100, Math.round((subtotal / 50.0) * 100));

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="max-w-xl mx-auto py-20 px-4 text-center">
                    <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500 border border-slate-700 shadow-inner">
                        <i data-lucide="shopping-cart" class="w-10 h-10"></i>
                    </div>
                    <h2 class="text-2xl font-black text-white mb-2">Your Cart is Empty</h2>
                    <p class="text-sm text-slate-400 mb-8 max-w-sm mx-auto">
                        Explore our trending catalog with verified supplier fulfillment and add items to your cart.
                    </p>
                    <a href="#store" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-600/30">
                        <i data-lucide="compass" class="w-4 h-4"></i> Browse Catalog
                    </a>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="max-w-6xl mx-auto px-4 py-8">
                <div class="flex items-center justify-between mb-8">
                    <h1 class="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                        <i data-lucide="shopping-bag" class="w-7 h-7 text-indigo-400"></i> Shopping Cart (${window.appState.getCartItemCount()} items)
                    </h1>
                    <a href="#store" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Continue Shopping
                    </a>
                </div>

                <!-- Free shipping bar -->
                <div class="mb-8 p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-sm">
                    <div class="flex items-center justify-between text-xs font-semibold text-white mb-2">
                        <span class="flex items-center gap-1.5">
                            <i data-lucide="truck" class="w-4 h-4 text-cyan-400"></i>
                            ${freeShippingDiff === 0 ? '<strong class="text-emerald-400">🎉 Congratulations! You qualify for FREE Standard Delivery!</strong>' : `Add <strong class="text-indigo-400">$${freeShippingDiff.toFixed(2)}</strong> more to get <strong class="text-white">FREE Express Shipping</strong>`}
                        </span>
                        <span class="text-slate-400">${freeShippingPct}%</span>
                    </div>
                    <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                        <div class="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-2 rounded-full transition-all duration-500" style="width: ${freeShippingPct}%"></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left: Cart Items List -->
                    <div class="lg:col-span-2 space-y-4">
                        ${cart.map(item => `
                            <div class="cart-item-row p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-600 transition"
                                 data-key="${item.key}">
                                <div class="flex items-center gap-4">
                                    <img src="${item.image}" alt="${item.title}" class="w-20 h-20 rounded-xl object-cover bg-slate-900 border border-slate-700">
                                    <div class="space-y-1">
                                        <h4 class="text-sm font-bold text-white line-clamp-1 hover:text-indigo-400 transition cursor-pointer" onclick="window.location.hash='#product/${item.slug}'">
                                            ${item.title}
                                        </h4>
                                        ${item.variant_title ? `<div class="text-xs text-indigo-400 font-semibold">Variant: ${item.variant_title}</div>` : ''}
                                        <div class="text-xs font-mono text-slate-400">SKU: ${item.sku}</div>
                                        <div class="text-xs font-black text-white sm:hidden">$${item.unit_price.toFixed(2)} each</div>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
                                    <!-- Stepper -->
                                    <div class="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                                        <button class="cart-minus-btn w-8 h-8 text-slate-400 hover:text-white flex items-center justify-center transition" data-key="${item.key}">
                                            <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                                        </button>
                                        <span class="w-8 text-center text-xs font-bold text-white">${item.quantity}</span>
                                        <button class="cart-plus-btn w-8 h-8 text-slate-400 hover:text-white flex items-center justify-center transition" data-key="${item.key}">
                                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>

                                    <!-- Total for item -->
                                    <div class="text-right min-w-[70px]">
                                        <div class="text-sm font-black text-white">$${(item.unit_price * item.quantity).toFixed(2)}</div>
                                        <div class="text-[10px] text-slate-400 hidden sm:block">$${item.unit_price.toFixed(2)}/ea</div>
                                    </div>

                                    <!-- Delete Item -->
                                    <button class="cart-remove-btn text-slate-400 hover:text-rose-400 p-2 rounded-lg transition" data-key="${item.key}" title="Remove item">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}

                        <div class="flex justify-between items-center pt-2">
                            <button id="clear-cart-btn" class="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1">
                                <i data-lucide="trash" class="w-3.5 h-3.5"></i> Clear Cart
                            </button>
                        </div>
                    </div>

                    <!-- Right: Order Summary Box -->
                    <div class="lg:col-span-1">
                        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-6 sticky top-24">
                            <h3 class="text-base font-bold text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                                <i data-lucide="receipt" class="w-4 h-4 text-indigo-400"></i> Order Summary
                            </h3>

                            <!-- Promo Code Input -->
                            <div class="space-y-2">
                                <label class="text-xs font-semibold text-slate-300">Have a Promo Code?</label>
                                <div class="flex gap-2">
                                    <input type="text" id="coupon-code-input" placeholder="e.g. WELCOME10" value="${this.appliedCoupon ? this.appliedCoupon.code : ''}"
                                           class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-indigo-500">
                                    <button id="apply-coupon-btn" class="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                                        Apply
                                    </button>
                                </div>
                                ${this.appliedCoupon ? `
                                    <div class="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2 rounded-lg">
                                        <span>Coupon <strong>${this.appliedCoupon.code}</strong> applied!</span>
                                        <button id="remove-coupon-btn" class="text-slate-400 hover:text-rose-400 text-[10px] font-bold">Remove</button>
                                    </div>
                                ` : `
                                    <div class="text-[11px] text-slate-400">
                                        Try code: <span class="font-mono text-indigo-400 cursor-pointer hover:underline" onclick="document.getElementById('coupon-code-input').value='WELCOME10';">WELCOME10</span> (10% off) or <span class="font-mono text-indigo-400 cursor-pointer hover:underline" onclick="document.getElementById('coupon-code-input').value='FREESHIP';">FREESHIP</span>
                                    </div>
                                `}
                            </div>

                            <!-- Cost Breakdown -->
                            <div class="space-y-2 text-xs text-slate-300 border-t border-slate-700 pt-4">
                                <div class="flex justify-between">
                                    <span>Subtotal</span>
                                    <span class="font-bold text-white">$${subtotal.toFixed(2)}</span>
                                </div>
                                ${this.discountAmount > 0 ? `
                                    <div class="flex justify-between text-emerald-400 font-semibold">
                                        <span>Discount (${this.appliedCoupon.code})</span>
                                        <span>-$${this.discountAmount.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between">
                                    <span>Estimated Shipping</span>
                                    <span class="font-bold ${this.shippingFee === 0 ? 'text-emerald-400' : 'text-white'}">
                                        ${this.shippingFee === 0 ? 'FREE' : `$${this.shippingFee.toFixed(2)}`}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Estimated Tax (8%)</span>
                                    <span class="font-bold text-white">$${this.taxAmount.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between text-base font-black text-white border-t border-slate-700 pt-3">
                                    <span>Estimated Total</span>
                                    <span class="text-indigo-400">$${this.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <!-- Proceed to Checkout Button -->
                            <button id="proceed-checkout-btn" class="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm">
                                <i data-lucide="lock" class="w-4 h-4"></i> Proceed to Secure Checkout
                            </button>

                            <!-- Guarantee Icons -->
                            <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-700/60">
                                <div class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i> SSL 256-bit Encrypted</div>
                                <div class="flex items-center gap-1"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-indigo-400"></i> 30-Day Escrow Return</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.bindCartEvents(container);
    },

    bindCartEvents(container) {
        // Quantity Plus
        container.querySelectorAll(".cart-plus-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const key = btn.getAttribute("data-key");
                const item = window.appState.cart.find(it => it.key === key);
                if (item) {
                    window.appState.updateCartQuantity(key, item.quantity + 1);
                    this.render(container);
                }
            });
        });

        // Quantity Minus
        container.querySelectorAll(".cart-minus-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const key = btn.getAttribute("data-key");
                const item = window.appState.cart.find(it => it.key === key);
                if (item) {
                    window.appState.updateCartQuantity(key, item.quantity - 1);
                    this.render(container);
                }
            });
        });

        // Remove Item
        container.querySelectorAll(".cart-remove-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const key = btn.getAttribute("data-key");
                window.appState.removeFromCart(key);
                this.render(container);
            });
        });

        // Clear Cart
        const clearBtn = container.querySelector("#clear-cart-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (confirm("Are you sure you want to clear your cart?")) {
                    window.appState.clearCart();
                    this.render(container);
                }
            });
        }

        // Apply Coupon
        const applyCouponBtn = container.querySelector("#apply-coupon-btn");
        const couponInput = container.querySelector("#coupon-code-input");
        if (applyCouponBtn && couponInput) {
            applyCouponBtn.addEventListener("click", async () => {
                const code = couponInput.value.trim().toUpperCase();
                if (!code) return;
                try {
                    applyCouponBtn.disabled = true;
                    applyCouponBtn.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
                    const res = await window.api.validateCoupon(code, window.appState.getCartSubtotal());
                    this.appliedCoupon = res;
                    window.showToast(`Coupon ${code} applied successfully!`, "success");
                    this.render(container);
                } catch (err) {
                    window.showToast(err.message, "error");
                    applyCouponBtn.disabled = false;
                    applyCouponBtn.textContent = "Apply";
                }
            });
        }

        // Remove Coupon
        const removeCouponBtn = container.querySelector("#remove-coupon-btn");
        if (removeCouponBtn) {
            removeCouponBtn.addEventListener("click", () => {
                this.appliedCoupon = null;
                window.showToast("Coupon removed.", "info");
                this.render(container);
            });
        }

        // Proceed to Checkout
        const proceedBtn = container.querySelector("#proceed-checkout-btn");
        if (proceedBtn) {
            proceedBtn.addEventListener("click", () => {
                window.location.hash = "#checkout";
            });
        }
    },

    renderCheckoutView(container) {
        const cart = window.appState.cart;
        const subtotal = window.appState.getCartSubtotal();
        const user = window.appState.user;

        container.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 py-8">
                <!-- Checkout Header -->
                <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                    <div>
                        <h1 class="text-2xl font-black text-white flex items-center gap-2">
                            <i data-lucide="shield-check" class="w-6 h-6 text-emerald-400"></i> Express Dropship Checkout
                        </h1>
                        <p class="text-xs text-slate-400 mt-1">Multi-supplier auto-routing with end-to-end buyer escrow protection</p>
                    </div>
                    <a href="#cart" class="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i> Back to Cart
                    </a>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left: Checkout Forms -->
                    <div class="lg:col-span-2 space-y-6">
                        
                        <!-- Step 1: Customer & Shipping Address -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-700 pb-3">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</span>
                                    Shipping Destination & Contact
                                </h3>
                                ${!user ? `
                                    <button id="checkout-login-trigger" class="text-xs text-indigo-400 hover:underline font-medium">
                                        Have an account? Log In
                                    </button>
                                ` : ''}
                            </div>

                            <!-- Saved Addresses Pills if logged in -->
                            ${this.savedAddresses.length > 0 ? `
                                <div class="space-y-2">
                                    <label class="text-xs font-semibold text-slate-300">Choose Saved Address:</label>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        ${this.savedAddresses.map(a => `
                                            <div class="saved-addr-card p-3 rounded-xl border transition cursor-pointer ${this.selectedAddressId === a.id ? 'bg-indigo-950/40 border-indigo-500 shadow-md' : 'bg-slate-900/60 border-slate-700 text-slate-400'}"
                                                 data-id="${a.id}">
                                                <div class="flex justify-between items-center text-xs font-bold ${this.selectedAddressId === a.id ? 'text-indigo-300' : 'text-slate-300'} mb-1">
                                                    <span>${a.title} ${a.is_default ? '<span class="text-[10px] text-emerald-400">(Default)</span>' : ''}</span>
                                                    <i data-lucide="${this.selectedAddressId === a.id ? 'check-circle-2' : 'circle'}" class="w-4 h-4 text-indigo-400"></i>
                                                </div>
                                                <div class="text-xs text-slate-300">${a.full_name}</div>
                                                <div class="text-[11px] text-slate-400">${a.street_address} ${a.apt_suite || ''}</div>
                                                <div class="text-[11px] text-slate-400">${a.city}, ${a.state} ${a.postal_code}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button id="toggle-custom-addr-btn" class="text-xs text-indigo-400 font-semibold hover:underline mt-1 block">
                                        + Ship to a different address
                                    </button>
                                </div>
                            ` : ''}

                            <!-- Address Input Form -->
                            <div id="address-form-container" class="${this.savedAddresses.length > 0 ? 'hidden' : ''} space-y-3 pt-2">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Recipient Full Name *</label>
                                        <input type="text" id="ship-name" value="${user ? user.full_name : ''}" placeholder="e.g. Sophia Martinez"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Email Address for Tracking Updates *</label>
                                        <input type="email" id="ship-email" value="${user ? user.email : ''}" placeholder="sophia@example.com"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div class="sm:col-span-2">
                                        <label class="block text-xs text-slate-400 mb-1">Street Address *</label>
                                        <input type="text" id="ship-street" placeholder="742 Evergreen Terrace"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Apt / Suite / Unit</label>
                                        <input type="text" id="ship-apt" placeholder="Apt 4B"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">City *</label>
                                        <input type="text" id="ship-city" placeholder="Austin"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">State / Province *</label>
                                        <input type="text" id="ship-state" placeholder="TX"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Postal Code *</label>
                                        <input type="text" id="ship-postal" placeholder="78701"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs text-slate-400 mb-1">Phone Number (For Delivery Carrier)</label>
                                    <input type="text" id="ship-phone" value="${user && user.phone ? user.phone : ''}" placeholder="+1 (555) 000-0000"
                                           class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Shipping Method -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                                <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">2</span>
                                Shipping & Delivery Carrier Options
                            </h3>

                            <div class="space-y-3">
                                <label class="shipping-option flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${this.shippingMethod === 'standard' ? 'bg-indigo-950/40 border-indigo-500' : 'bg-slate-900/60 border-slate-700'}"
                                       data-method="standard">
                                    <div class="flex items-center gap-3">
                                        <input type="radio" name="shipping-method" value="standard" ${this.shippingMethod === 'standard' ? 'checked' : ''} class="text-indigo-600 focus:ring-0">
                                        <div>
                                            <div class="text-xs font-bold text-white flex items-center gap-2">
                                                Standard Direct Express (YunExpress / ePacket / 4PX)
                                                ${subtotal >= 50.0 ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">FREE Over $50</span>' : ''}
                                            </div>
                                            <div class="text-[11px] text-slate-400">Estimated delivery: 5-8 business days with live checkpoint tracking</div>
                                        </div>
                                    </div>
                                    <span class="text-xs font-black ${subtotal >= 50.0 ? 'text-emerald-400' : 'text-white'}">
                                        ${subtotal >= 50.0 ? 'FREE' : '$4.99'}
                                    </span>
                                </label>

                                <label class="shipping-option flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${this.shippingMethod === 'express' ? 'bg-indigo-950/40 border-indigo-500' : 'bg-slate-900/60 border-slate-700'}"
                                       data-method="express">
                                    <div class="flex items-center gap-3">
                                        <input type="radio" name="shipping-method" value="express" ${this.shippingMethod === 'express' ? 'checked' : ''} class="text-indigo-600 focus:ring-0">
                                        <div>
                                            <div class="text-xs font-bold text-white flex items-center gap-2">
                                                Priority Air Cargo (DHL Express / FedEx International)
                                                <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">Fast Priority</span>
                                            </div>
                                            <div class="text-[11px] text-slate-400">Estimated delivery: 2-4 business days with signature confirmation</div>
                                        </div>
                                    </div>
                                    <span class="text-xs font-black text-white">$14.99</span>
                                </label>
                            </div>
                        </div>

                        <!-- Step 3: Payment Method -->
                        <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-700 pb-3">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">3</span>
                                    Payment Method
                                </h3>
                                <div class="flex items-center gap-2 text-slate-400 text-xs">
                                    <i data-lucide="lock" class="w-3.5 h-3.5 text-emerald-400"></i> Encrypted Gateway
                                </div>
                            </div>

                            <!-- Test Card Autofill Button -->
                            <div class="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-xs">
                                <span class="text-indigo-300 font-medium">Demo Testing Mode: Simulated Stripe Gateway</span>
                                <button id="autofill-card-btn" class="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition">
                                    Fill Test Card
                                </button>
                            </div>

                            <!-- Card Inputs -->
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs text-slate-400 mb-1">Card Number *</label>
                                    <div class="relative">
                                        <input type="text" id="card-number" placeholder="4242 •••• •••• 4242" value="4242 4242 4242 4242"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500">
                                        <i data-lucide="credit-card" class="w-4 h-4 text-slate-400 absolute right-3 top-2.5"></i>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Expiry Date (MM/YY) *</label>
                                        <input type="text" id="card-expiry" placeholder="12/28" value="12/28"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">CVC / CVV *</label>
                                        <input type="text" id="card-cvc" placeholder="888" value="888" maxlength="4"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Order Summary Sidebar -->
                    <div class="lg:col-span-1">
                        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-6 sticky top-24">
                            <h3 class="text-base font-bold text-white border-b border-slate-700 pb-3 flex items-center justify-between">
                                <span>Order Summary</span>
                                <span class="text-xs font-normal text-slate-400">${cart.length} items</span>
                            </h3>

                            <!-- Items Summary List -->
                            <div class="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                                ${cart.map(item => `
                                    <div class="flex items-center justify-between gap-3 text-xs">
                                        <div class="flex items-center gap-2">
                                            <div class="relative">
                                                <img src="${item.image}" class="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-700">
                                                <span class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">${item.quantity}</span>
                                            </div>
                                            <div>
                                                <div class="text-slate-200 font-bold line-clamp-1 max-w-[130px]">${item.title}</div>
                                                <div class="text-[10px] text-slate-400">${item.variant_title || 'Standard'}</div>
                                            </div>
                                        </div>
                                        <div class="font-bold text-white">$${(item.unit_price * item.quantity).toFixed(2)}</div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Cost Breakdown -->
                            <div class="space-y-2 text-xs text-slate-300 border-t border-slate-700 pt-4">
                                <div class="flex justify-between">
                                    <span>Subtotal</span>
                                    <span class="font-bold text-white">$${subtotal.toFixed(2)}</span>
                                </div>
                                ${this.discountAmount > 0 ? `
                                    <div class="flex justify-between text-emerald-400 font-semibold">
                                        <span>Promo Discount</span>
                                        <span>-$${this.discountAmount.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between">
                                    <span>Shipping & Handling</span>
                                    <span class="font-bold ${this.shippingFee === 0 ? 'text-emerald-400' : 'text-white'}">
                                        ${this.shippingFee === 0 ? 'FREE' : `$${this.shippingFee.toFixed(2)}`}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Estimated Tax (8%)</span>
                                    <span class="font-bold text-white">$${this.taxAmount.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between text-lg font-black text-white border-t border-slate-700 pt-3">
                                    <span>Total Due</span>
                                    <span class="text-indigo-400">$${this.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <!-- Complete Order Button -->
                            <button id="submit-order-btn" class="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 px-6 rounded-xl shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm">
                                <i data-lucide="check" class="w-5 h-5"></i> Pay & Authorize Order • $${this.totalAmount.toFixed(2)}
                            </button>

                            <div class="text-center text-[11px] text-slate-400">
                                🔒 Payment processed securely with simulated PCI-DSS tokenization.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.bindCheckoutEvents(container);
    },

    bindCheckoutEvents(container) {
        // Login trigger
        const loginTrigger = container.querySelector("#checkout-login-trigger");
        if (loginTrigger) {
            loginTrigger.addEventListener("click", () => window.AuthModal.open());
        }

        // Saved Address Selection
        container.querySelectorAll(".saved-addr-card").forEach(card => {
            card.addEventListener("click", () => {
                const addrId = parseInt(card.getAttribute("data-id"));
                this.selectedAddressId = addrId;
                this.render(container);
            });
        });

        // Toggle Custom Address
        const toggleCustomBtn = container.querySelector("#toggle-custom-addr-btn");
        const customAddrContainer = container.querySelector("#address-form-container");
        if (toggleCustomBtn && customAddrContainer) {
            toggleCustomBtn.addEventListener("click", () => {
                this.selectedAddressId = null;
                customAddrContainer.classList.remove("hidden");
                toggleCustomBtn.classList.add("hidden");
            });
        }

        // Shipping Method Selection
        container.querySelectorAll(".shipping-option").forEach(opt => {
            opt.addEventListener("click", () => {
                const method = opt.getAttribute("data-method");
                this.shippingMethod = method;
                this.calculateTotals();
                this.render(container);
            });
        });

        // Autofill Card
        const autofillBtn = container.querySelector("#autofill-card-btn");
        if (autofillBtn) {
            autofillBtn.addEventListener("click", () => {
                container.querySelector("#card-number").value = "4242 4242 4242 4242";
                container.querySelector("#card-expiry").value = "12/28";
                container.querySelector("#card-cvc").value = "888";
                window.showToast("Test card autofilled!", "info");
            });
        }

        // Place Order Submission
        const submitOrderBtn = container.querySelector("#submit-order-btn");
        if (submitOrderBtn) {
            submitOrderBtn.addEventListener("click", async () => {
                let addressPayload = {};
                let customerInfo = {};

                if (this.selectedAddressId) {
                    const saved = this.savedAddresses.find(a => a.id === this.selectedAddressId);
                    if (saved) {
                        addressPayload = {
                            full_name: saved.full_name,
                            street_address: saved.street_address,
                            apt_suite: saved.apt_suite,
                            city: saved.city,
                            state: saved.state,
                            postal_code: saved.postal_code,
                            country: saved.country,
                            phone: saved.phone
                        };
                        customerInfo = {
                            name: saved.full_name,
                            email: window.appState.user ? window.appState.user.email : "shopper@example.com",
                            phone: saved.phone
                        };
                    }
                } else {
                    const name = container.querySelector("#ship-name").value.trim();
                    const email = container.querySelector("#ship-email").value.trim();
                    const street = container.querySelector("#ship-street").value.trim();
                    const apt = container.querySelector("#ship-apt").value.trim();
                    const city = container.querySelector("#ship-city").value.trim();
                    const state = container.querySelector("#ship-state").value.trim();
                    const postal = container.querySelector("#ship-postal").value.trim();
                    const phone = container.querySelector("#ship-phone").value.trim();

                    if (!name || !email || !street || !city || !state || !postal) {
                        window.showToast("Please fill in all required shipping address fields.", "warning");
                        return;
                    }

                    addressPayload = {
                        full_name: name,
                        street_address: street,
                        apt_suite: apt,
                        city: city,
                        state: state,
                        postal_code: postal,
                        country: "United States",
                        phone: phone
                    };
                    customerInfo = { name, email, phone };
                }

                const orderPayload = {
                    items: window.appState.cart.map(it => ({
                        product_id: it.product_id,
                        variant_id: it.variant_id,
                        quantity: it.quantity
                    })),
                    shipping_address: addressPayload,
                    customer_info: customerInfo,
                    shipping_method: this.shippingMethod,
                    coupon_code: this.appliedCoupon ? this.appliedCoupon.code : null,
                    payment_method: "card"
                };

                try {
                    submitOrderBtn.disabled = true;
                    submitOrderBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Authorizing & Routing Order...`;
                    
                    const res = await window.api.placeOrder(orderPayload);
                    this.lastOrder = res;
                    this.step = "success";

                    // Confetti celebration
                    if (window.confetti) {
                        window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    }

                    window.appState.clearCart();
                    this.render(container);
                } catch (err) {
                    window.showToast(err.message, "error");
                    submitOrderBtn.disabled = false;
                    submitOrderBtn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Pay & Authorize Order • $${this.totalAmount.toFixed(2)}`;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        }
    },

    renderSuccessView(container) {
        const order = this.lastOrder;

        container.innerHTML = `
            <div class="max-w-3xl mx-auto px-4 py-12 text-center space-y-8">
                <!-- Success Badge -->
                <div class="space-y-3">
                    <div class="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20 animate-glow">
                        <i data-lucide="check-circle" class="w-10 h-10"></i>
                    </div>
                    <div class="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        Payment & Fulfillment Confirmed
                    </div>
                    <h1 class="text-3xl font-black text-white">Order #${order.order_number} Received!</h1>
                    <p class="text-sm text-slate-300 max-w-md mx-auto">
                        Thank you for your purchase. We have auto-routed your items to respective supplier warehouses for immediate packaging and dispatch.
                    </p>
                </div>

                <!-- Fulfillments Breakdown Card -->
                <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md text-left space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center justify-between border-b border-slate-700 pb-3">
                        <span class="flex items-center gap-2"><i data-lucide="boxes" class="w-4 h-4 text-indigo-400"></i> Dispatch & Routing Overview</span>
                        <span class="text-xs font-mono text-emerald-400">Paid: $${order.total_amount.toFixed(2)}</span>
                    </h3>

                    <div class="space-y-3">
                        ${order.fulfillments && order.fulfillments.length > 0 ? order.fulfillments.map((ful, idx) => `
                            <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <div class="text-xs font-bold text-white flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded bg-indigo-600 text-[10px] text-white">Package #${idx + 1}</span>
                                        ${ful.carrier} Express Priority
                                    </div>
                                    <div class="text-xs font-mono text-slate-400 mt-1">
                                        Tracking #: <strong class="text-indigo-300">${ful.tracking_number}</strong>
                                    </div>
                                </div>
                                <a href="#tracking?order=${order.order_number}" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md">
                                    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> Track Package
                                </a>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <a href="#tracking?order=${order.order_number}" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm">
                        <i data-lucide="navigation" class="w-4 h-4"></i> Live Shipment Tracker
                    </a>
                    <a href="#account" class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-8 py-3.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 text-sm">
                        <i data-lucide="user" class="w-4 h-4"></i> View in My Orders
                    </a>
                    <a href="#store" class="w-full sm:w-auto text-xs text-slate-400 hover:text-white font-semibold py-3 px-4">
                        Continue Shopping
                    </a>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }
};
