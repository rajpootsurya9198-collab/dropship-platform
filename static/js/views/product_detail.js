// Product Detail Modal & View

window.ProductDetailModal = {
    currentProduct: null,
    selectedVariant: null,
    selectedImageIndex: 0,
    quantity: 1,

    async open(productOrSlug) {
        let product = productOrSlug;
        if (typeof productOrSlug === "string" || typeof productOrSlug === "number") {
            try {
                const res = await window.api.getProductDetail(productOrSlug);
                product = res.product;
            } catch (err) {
                window.showToast("Product not found or unavailable.", "error");
                return;
            }
        }

        this.currentProduct = product;
        this.selectedVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
        this.selectedImageIndex = 0;
        this.quantity = 1;

        this.renderModal();
    },

    close() {
        const modal = document.getElementById("product-detail-modal");
        if (modal) {
            modal.classList.add("hidden");
            if (window.location.hash.startsWith("#product/")) {
                window.location.hash = "#store";
            }
        }
    },

    renderModal() {
        let modal = document.getElementById("product-detail-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "product-detail-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto modal-backdrop";
            document.body.appendChild(modal);
        }

        const p = this.currentProduct;
        const images = p.images && p.images.length > 0 ? p.images : [p.primary_image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"];
        
        const currentPrice = this.selectedVariant ? this.selectedVariant.retail_price : p.retail_price;
        const currentCompare = this.selectedVariant ? this.selectedVariant.compare_at_price : p.compare_at_price;
        const currentStock = this.selectedVariant ? this.selectedVariant.stock_quantity : p.stock_quantity;
        const currentSku = this.selectedVariant ? this.selectedVariant.sku : p.sku;

        const discountPct = currentCompare ? Math.round(((currentCompare - currentPrice) / currentCompare) * 100) : 0;

        modal.innerHTML = `
            <div class="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
                <!-- Header / Close button -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span class="text-indigo-400 font-bold uppercase tracking-wider">${p.category_name}</span>
                        <span>•</span>
                        <span class="font-mono text-slate-400">SKU: ${currentSku}</span>
                    </div>
                    <button id="modal-close-btn" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Scrollable Body -->
                <div class="overflow-y-auto p-6 space-y-8 flex-1">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        <!-- Left: Image Gallery -->
                        <div class="space-y-4">
                            <div class="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                                <img id="main-product-img" src="${images[this.selectedImageIndex]}" alt="${p.title}"
                                     class="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105">
                                ${discountPct > 0 ? `
                                    <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                                        -${discountPct}% OFF
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Thumbnails -->
                            ${images.length > 1 ? `
                                <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                    ${images.map((img, idx) => `
                                        <button class="thumb-btn flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${idx === this.selectedImageIndex ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/30' : 'border-slate-800 opacity-60 hover:opacity-100'}"
                                                data-index="${idx}">
                                            <img src="${img}" class="w-full h-full object-cover">
                                        </button>
                                    `).join('')}
                                </div>
                            ` : ''}

                            <!-- Verified Supplier Trust Box -->
                            <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="font-bold text-white flex items-center gap-1.5">
                                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i> Verified Dropship Supplier
                                    </span>
                                    <span class="text-amber-400 font-bold flex items-center gap-1">
                                        <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i> ${p.supplier_rating}
                                    </span>
                                </div>
                                <div class="text-slate-300 font-medium">${p.supplier_name}</div>
                                <div class="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-[11px]">
                                    <div><i data-lucide="map-pin" class="w-3 h-3 inline text-slate-500"></i> Origin: <strong>${p.shipping_origin}</strong></div>
                                    <div><i data-lucide="truck" class="w-3 h-3 inline text-slate-500"></i> SLA: <strong>${p.fulfillment_sla_days} Days Dispatch</strong></div>
                                </div>
                                <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                                    <i data-lucide="rotate-ccw" class="w-3 h-3 inline text-indigo-400 mr-1"></i> Policy: ${p.supplier_return_policy || '30-Day Money Back Guarantee'}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Info, Variant Selector & Purchase -->
                        <div class="space-y-6 flex flex-col justify-between">
                            <div class="space-y-4">
                                <h1 class="text-xl sm:text-2xl font-black text-white leading-snug">${p.title}</h1>

                                <!-- Ratings & Reviews count -->
                                <div class="flex items-center gap-2 text-sm">
                                    <div class="flex text-amber-400">
                                        <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
                                    </div>
                                    <span class="font-bold text-white">${p.rating_avg.toFixed(1)}</span>
                                    <span class="text-slate-400 text-xs">(${p.rating_count} customer reviews)</span>
                                    <span class="text-slate-600">•</span>
                                    <span class="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                        <i data-lucide="badge-check" class="w-3.5 h-3.5"></i> Verified Buyer Guarantee
                                    </span>
                                </div>

                                <!-- Price Block -->
                                <div class="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50 flex items-baseline gap-3">
                                    <span id="price-display" class="text-3xl font-black text-white">$${currentPrice.toFixed(2)}</span>
                                    ${currentCompare ? `<span id="compare-display" class="text-sm text-slate-400 line-through">$${currentCompare.toFixed(2)}</span>` : ''}
                                    ${discountPct > 0 ? `<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">Save $${(currentCompare - currentPrice).toFixed(2)}</span>` : ''}
                                </div>

                                <!-- Short Description -->
                                ${p.short_description ? `
                                    <p class="text-sm text-slate-300 leading-relaxed">${p.short_description}</p>
                                ` : ''}

                                <!-- Variant Selector (if variants exist) -->
                                ${p.variants && p.variants.length > 0 ? `
                                    <div class="space-y-3 pt-2">
                                        <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            Select Variant / Option: <span id="selected-variant-name" class="text-indigo-400 font-semibold">${this.selectedVariant ? this.selectedVariant.title : ''}</span>
                                        </label>
                                        <div class="flex flex-wrap gap-2">
                                            ${p.variants.map(v => `
                                                <button class="variant-pill px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${this.selectedVariant && this.selectedVariant.id === v.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}"
                                                        data-var-id="${v.id}">
                                                    ${v.title} - $${v.retail_price.toFixed(2)}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Stock Status Indicator -->
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="w-2 h-2 rounded-full ${currentStock > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}"></span>
                                    <span class="text-slate-300 font-medium">
                                        ${currentStock > 0 ? `<strong class="text-emerald-400">${currentStock} units in stock</strong> ready for instant fulfillment.` : '<strong class="text-rose-400">Temporarily out of stock</strong>'}
                                    </span>
                                </div>

                                <!-- Quantity & Add to Cart -->
                                <div class="pt-4 border-t border-slate-800 space-y-3">
                                    <div class="flex items-center gap-3">
                                        <!-- Quantity Stepper -->
                                        <div class="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                                            <button id="qty-minus-btn" class="w-10 h-11 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition">
                                                <i data-lucide="minus" class="w-4 h-4"></i>
                                            </button>
                                            <span id="qty-display" class="w-10 text-center text-sm font-bold text-white">1</span>
                                            <button id="qty-plus-btn" class="w-10 h-11 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition">
                                                <i data-lucide="plus" class="w-4 h-4"></i>
                                            </button>
                                        </div>

                                        <!-- Add to Cart Button -->
                                        <button id="modal-add-cart-btn" class="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                ${currentStock <= 0 ? 'disabled' : ''}>
                                            <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                                            Add To Cart • $<span id="btn-total-display">${(currentPrice * this.quantity).toFixed(2)}</span>
                                        </button>
                                    </div>

                                    <!-- 1-Click Fast Express Checkout -->
                                    <button id="modal-buy-now-btn" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 text-xs"
                                            ${currentStock <= 0 ? 'disabled' : ''}>
                                        <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i> Fast Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs: Product Description & Customer Reviews -->
                    <div class="pt-6 border-t border-slate-800 space-y-6">
                        <div class="flex border-b border-slate-800 gap-6">
                            <button id="tab-desc-btn" class="tab-header active pb-3 text-sm font-bold text-indigo-400 border-b-2 border-indigo-500">
                                Detailed Description & Specs
                            </button>
                            <button id="tab-reviews-btn" class="tab-header pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200">
                                Customer Reviews (${p.reviews ? p.reviews.length : 0})
                            </button>
                        </div>

                        <!-- Description Content -->
                        <div id="tab-desc-content" class="text-sm text-slate-300 leading-relaxed space-y-3 prose prose-invert max-w-none">
                            ${p.description}
                        </div>

                        <!-- Reviews Content -->
                        <div id="tab-reviews-content" class="hidden space-y-6">
                            <!-- Submit Review Box -->
                            <div class="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-4">
                                <h4 class="text-sm font-bold text-white flex items-center gap-2">
                                    <i data-lucide="message-square-plus" class="w-4 h-4 text-indigo-400"></i> Write a Verified Customer Review
                                </h4>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Your Rating</label>
                                        <select id="review-rating-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                                            <option value="5">⭐⭐⭐⭐⭐ (5/5 Stars - Outstanding)</option>
                                            <option value="4">⭐⭐⭐⭐ (4/5 Stars - Very Good)</option>
                                            <option value="3">⭐⭐⭐ (3/5 Stars - Average)</option>
                                            <option value="2">⭐⭐ (2/5 Stars - Needs Improvement)</option>
                                            <option value="1">⭐ (1/5 Star - Poor)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs text-slate-400 mb-1">Review Headline</label>
                                        <input type="text" id="review-title-input" placeholder="e.g. Best headphones I've ever owned!"
                                               class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs text-slate-400 mb-1">Your Detailed Experience</label>
                                    <textarea id="review-comment-input" rows="3" placeholder="Share your experience regarding product quality, shipping speed, and packaging..."
                                              class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"></textarea>
                                </div>
                                <button id="submit-review-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-md flex items-center gap-1.5">
                                    Submit Review
                                </button>
                            </div>

                            <!-- Reviews List -->
                            <div class="space-y-4">
                                ${p.reviews && p.reviews.length > 0 ? p.reviews.map(r => `
                                    <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <div class="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                                                    ${r.user_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div class="text-xs font-bold text-white flex items-center gap-1.5">
                                                        ${r.user_name}
                                                        ${r.verified_purchase ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Verified Purchase</span>' : ''}
                                                    </div>
                                                    <div class="text-[10px] text-slate-500">${r.created_at}</div>
                                                </div>
                                            </div>
                                            <div class="flex text-amber-400 text-xs">
                                                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                                            </div>
                                        </div>
                                        <div class="text-xs font-bold text-slate-200">${r.title}</div>
                                        <p class="text-xs text-slate-300 leading-relaxed">${r.comment}</p>
                                    </div>
                                `).join('') : `
                                    <div class="text-center py-8 text-slate-500 text-xs">
                                        No reviews yet for this product. Be the first to leave a review!
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        this.bindEvents(modal);
    },

    bindEvents(modal) {
        // Close modal
        modal.querySelector("#modal-close-btn").addEventListener("click", () => this.close());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) this.close();
        });

        // Image Thumbnails
        modal.querySelectorAll(".thumb-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-index"));
                this.selectedImageIndex = idx;
                const p = this.currentProduct;
                const images = p.images && p.images.length > 0 ? p.images : [p.primary_image];
                modal.querySelector("#main-product-img").src = images[idx];
                modal.querySelectorAll(".thumb-btn").forEach((b, i) => {
                    if (i === idx) {
                        b.className = "thumb-btn flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/30 transition";
                    } else {
                        b.className = "thumb-btn flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-800 opacity-60 hover:opacity-100 transition";
                    }
                });
            });
        });

        // Variant Selection
        modal.querySelectorAll(".variant-pill").forEach(btn => {
            btn.addEventListener("click", () => {
                const varId = parseInt(btn.getAttribute("data-var-id"));
                const variant = this.currentProduct.variants.find(v => v.id === varId);
                if (variant) {
                    this.selectedVariant = variant;
                    modal.querySelector("#selected-variant-name").textContent = variant.title;
                    modal.querySelector("#price-display").textContent = `$${variant.retail_price.toFixed(2)}`;
                    modal.querySelector("#btn-total-display").textContent = (variant.retail_price * this.quantity).toFixed(2);
                    
                    modal.querySelectorAll(".variant-pill").forEach(b => {
                        if (parseInt(b.getAttribute("data-var-id")) === varId) {
                            b.className = "variant-pill px-3.5 py-2 rounded-xl text-xs font-semibold border bg-indigo-600 border-indigo-500 text-white shadow-md transition";
                        } else {
                            b.className = "variant-pill px-3.5 py-2 rounded-xl text-xs font-semibold border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition";
                        }
                    });
                }
            });
        });

        // Quantity Stepper
        const qtyDisplay = modal.querySelector("#qty-display");
        const btnTotalDisplay = modal.querySelector("#btn-total-display");
        const qtyMinus = modal.querySelector("#qty-minus-btn");
        const qtyPlus = modal.querySelector("#qty-plus-btn");

        const updateQtyUI = () => {
            qtyDisplay.textContent = this.quantity;
            const unitPrice = this.selectedVariant ? this.selectedVariant.retail_price : this.currentProduct.retail_price;
            btnTotalDisplay.textContent = (unitPrice * this.quantity).toFixed(2);
        };

        qtyMinus.addEventListener("click", () => {
            if (this.quantity > 1) {
                this.quantity--;
                updateQtyUI();
            }
        });
        qtyPlus.addEventListener("click", () => {
            const maxStock = this.selectedVariant ? this.selectedVariant.stock_quantity : this.currentProduct.stock_quantity;
            if (this.quantity < maxStock) {
                this.quantity++;
                updateQtyUI();
            } else {
                window.showToast(`Cannot exceed maximum available stock (${maxStock}).`, "warning");
            }
        });

        // Add to Cart
        modal.querySelector("#modal-add-cart-btn").addEventListener("click", () => {
            const success = window.appState.addToCart(this.currentProduct, this.selectedVariant, this.quantity);
            if (success) {
                this.close();
            }
        });

        // Buy Now
        modal.querySelector("#modal-buy-now-btn").addEventListener("click", () => {
            const success = window.appState.addToCart(this.currentProduct, this.selectedVariant, this.quantity);
            if (success) {
                this.close();
                window.location.hash = "#checkout";
            }
        });

        // Tabs
        const tabDescBtn = modal.querySelector("#tab-desc-btn");
        const tabReviewsBtn = modal.querySelector("#tab-reviews-btn");
        const tabDescContent = modal.querySelector("#tab-desc-content");
        const tabReviewsContent = modal.querySelector("#tab-reviews-content");

        tabDescBtn.addEventListener("click", () => {
            tabDescBtn.className = "tab-header active pb-3 text-sm font-bold text-indigo-400 border-b-2 border-indigo-500";
            tabReviewsBtn.className = "tab-header pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200";
            tabDescContent.classList.remove("hidden");
            tabReviewsContent.classList.add("hidden");
        });

        tabReviewsBtn.addEventListener("click", () => {
            tabReviewsBtn.className = "tab-header active pb-3 text-sm font-bold text-indigo-400 border-b-2 border-indigo-500";
            tabDescBtn.className = "tab-header pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200";
            tabReviewsContent.classList.remove("hidden");
            tabDescContent.classList.add("hidden");
        });

        // Submit Review Form
        const submitReviewBtn = modal.querySelector("#submit-review-btn");
        submitReviewBtn.addEventListener("click", async () => {
            const rating = parseInt(modal.querySelector("#review-rating-select").value);
            const title = modal.querySelector("#review-title-input").value.trim();
            const comment = modal.querySelector("#review-comment-input").value.trim();

            if (!title || !comment) {
                window.showToast("Please provide both a review headline and comment.", "warning");
                return;
            }

            try {
                submitReviewBtn.disabled = true;
                submitReviewBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
                await window.api.submitReview(this.currentProduct.id, { rating, title, comment });
                window.showToast("Review submitted successfully!", "success");
                // Reload product detail
                this.open(this.currentProduct.id);
            } catch (err) {
                window.showToast(err.message, "error");
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = "Submit Review";
            }
        });
    }
};
