// Storefront View: High-Converting Catalog, Search & Product Grid

window.StorefrontView = {
    selectedCategory: null,
    searchQuery: "",
    minPrice: null,
    maxPrice: null,
    sortBy: "featured",
    currentPage: 1,
    products: [],
    categories: [],
    pagination: {},
    loading: false,

    async render(container) {
        container.innerHTML = `
            <!-- Hero Banner -->
            <div class="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800/80 py-12 md:py-16 px-4 sm:px-6 lg:px-8 mb-8 overflow-hidden rounded-2xl shadow-2xl">
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent"></div>
                <div class="relative max-w-5xl mx-auto text-center">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-glow">
                        <i data-lucide="zap" class="w-3.5 h-3.5"></i> Global Verified Supplier Network
                    </div>
                    <h1 class="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                        Premium Trending Products, <span class="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Direct-to-Door</span>
                    </h1>
                    <p class="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
                        Curated high-demand products fulfilled by verified global manufacturers. Fast dispatch, live end-to-end tracking, and 30-day money-back guarantee.
                    </p>

                    <!-- Big Search Bar in Hero -->
                    <div class="max-w-2xl mx-auto relative mb-6">
                        <div class="flex items-center bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl shadow-lg p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
                            <i data-lucide="search" class="w-5 h-5 text-slate-400 ml-3 mr-2"></i>
                            <input type="text" id="hero-search-input" placeholder="Search headphones, titanium gear, smart home..."
                                   class="w-full bg-transparent text-white text-sm focus:outline-none placeholder-slate-400 py-2">
                            <button id="hero-search-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-md flex items-center gap-1.5">
                                Search
                            </button>
                        </div>
                    </div>

                    <!-- Trust Badges -->
                    <div class="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs text-slate-400 font-medium">
                        <div class="flex items-center gap-1.5"><i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i> Buyer Protection Escrow</div>
                        <div class="flex items-center gap-1.5"><i data-lucide="truck" class="w-4 h-4 text-cyan-400"></i> Free Express Shipping > $50</div>
                        <div class="flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4 text-amber-400"></i> 24-48h Supplier Dispatch SLA</div>
                        <div class="flex items-center gap-1.5"><i data-lucide="rotate-ccw" class="w-4 h-4 text-indigo-400"></i> Easy 30-Day Returns</div>
                    </div>
                </div>
            </div>

            <!-- Categories Pill Carousel / Bar -->
            <div id="category-pills-container" class="mb-8 overflow-x-auto pb-2 scrollbar-none flex gap-2 sm:gap-3">
                <button class="cat-pill active px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/30" data-cat="">
                    <i data-lucide="grid" class="w-4 h-4"></i> All Categories
                </button>
                <!-- Dynamic categories loaded here -->
            </div>

            <!-- Main Content: Filters + Product Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Filters Sidebar -->
                <div class="lg:col-span-1 space-y-6">
                    <div class="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-sm space-y-5">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-700">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <i data-lucide="sliders-horizontal" class="w-4 h-4 text-indigo-400"></i> Filters
                            </h3>
                            <button id="reset-filters-btn" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                Reset All
                            </button>
                        </div>

                        <!-- Sort By -->
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Sort By</label>
                            <select id="sort-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                                <option value="featured">Featured & Best Selling</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="rating">Highest Customer Rating</option>
                                <option value="newest">Newest Arrivals</option>
                            </select>
                        </div>

                        <!-- Price Range Filter -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Price Range</label>
                                <span id="price-range-display" class="text-xs font-bold text-indigo-400">$0 - $200</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <input type="number" id="min-price-input" placeholder="Min $" min="0" class="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                                <span class="text-slate-500 text-xs">to</span>
                                <input type="number" id="max-price-input" placeholder="Max $" min="0" class="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                            </div>
                            <button id="apply-price-btn" class="mt-2.5 w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-1.5 rounded-lg transition">
                                Apply Price Filter
                            </button>
                        </div>

                        <!-- Verified Suppliers Badge Box -->
                        <div class="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-lg text-xs space-y-1.5">
                            <div class="font-bold text-indigo-300 flex items-center gap-1.5">
                                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> Direct Supplier Pricing
                            </div>
                            <p class="text-slate-400 leading-relaxed">
                                Transparent pricing verified directly against manufacturer inventory with real-time stock sync.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Product Grid & Pagination -->
                <div class="lg:col-span-3">
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-sm text-slate-300">
                            Showing <span id="product-count-display" class="font-bold text-white">...</span> products
                            <span id="active-filter-tag" class="ml-2 hidden px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-medium"></span>
                        </div>
                    </div>

                    <!-- Products Container -->
                    <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <!-- Product Cards injected here -->
                    </div>

                    <!-- Empty State -->
                    <div id="no-products-state" class="hidden text-center py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8">
                        <div class="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <i data-lucide="package-x" class="w-8 h-8"></i>
                        </div>
                        <h3 class="text-lg font-bold text-white mb-1">No products found</h3>
                        <p class="text-sm text-slate-400 max-w-sm mx-auto mb-6">Try adjusting your keyword search or clearing your active filters.</p>
                        <button id="empty-reset-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
                            Reset Search & Filters
                        </button>
                    </div>

                    <!-- Pagination -->
                    <div id="pagination-controls" class="mt-8 flex justify-center items-center gap-2"></div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.bindEvents(container);
        await this.loadCategories();
        await this.loadProducts();
    },

    bindEvents(container) {
        // Hero Search
        const searchInput = container.querySelector("#hero-search-input");
        const searchBtn = container.querySelector("#hero-search-btn");

        const performSearch = () => {
            this.searchQuery = searchInput.value.trim();
            this.currentPage = 1;
            this.loadProducts();
        };

        searchBtn.addEventListener("click", performSearch);
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") performSearch();
        });

        // Sort Select
        const sortSelect = container.querySelector("#sort-select");
        sortSelect.addEventListener("change", () => {
            this.sortBy = sortSelect.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Price Filter
        const applyPriceBtn = container.querySelector("#apply-price-btn");
        applyPriceBtn.addEventListener("click", () => {
            const minVal = parseFloat(container.querySelector("#min-price-input").value);
            const maxVal = parseFloat(container.querySelector("#max-price-input").value);
            this.minPrice = isNaN(minVal) ? null : minVal;
            this.maxPrice = isNaN(maxVal) ? null : maxVal;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Reset Filters
        const resetBtn = container.querySelector("#reset-filters-btn");
        const emptyResetBtn = container.querySelector("#empty-reset-btn");
        const resetAll = () => {
            this.searchQuery = "";
            this.selectedCategory = null;
            this.minPrice = null;
            this.maxPrice = null;
            this.sortBy = "featured";
            this.currentPage = 1;
            searchInput.value = "";
            container.querySelector("#min-price-input").value = "";
            container.querySelector("#max-price-input").value = "";
            sortSelect.value = "featured";
            this.updateCategoryPills();
            this.loadProducts();
        };
        if (resetBtn) resetBtn.addEventListener("click", resetAll);
        if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetAll);
    },

    async loadCategories() {
        try {
            const res = await window.api.getCategories();
            this.categories = res.categories || [];
            this.renderCategoryPills();
        } catch (e) {
            console.error("Failed to load categories:", e);
        }
    },

    renderCategoryPills() {
        const container = document.getElementById("category-pills-container");
        if (!container) return;

        let html = `
            <button class="cat-pill ${!this.selectedCategory ? 'active bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/80'} px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2" data-cat="">
                <i data-lucide="grid" class="w-4 h-4"></i> All Products
            </button>
        `;

        this.categories.forEach(c => {
            const isActive = this.selectedCategory === c.slug;
            html += `
                <button class="cat-pill ${isActive ? 'active bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/80'} px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2" data-cat="${c.slug}">
                    <i data-lucide="${c.icon || 'tag'}" class="w-4 h-4 text-indigo-400"></i> ${c.name}
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900/60 text-slate-400">${c.product_count}</span>
                </button>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

        container.querySelectorAll(".cat-pill").forEach(btn => {
            btn.addEventListener("click", () => {
                const catSlug = btn.getAttribute("data-cat");
                this.selectedCategory = catSlug || null;
                this.currentPage = 1;
                this.updateCategoryPills();
                this.loadProducts();
            });
        });
    },

    updateCategoryPills() {
        const container = document.getElementById("category-pills-container");
        if (!container) return;
        container.querySelectorAll(".cat-pill").forEach(btn => {
            const cat = btn.getAttribute("data-cat");
            const active = (!this.selectedCategory && !cat) || (this.selectedCategory === cat);
            if (active) {
                btn.className = "cat-pill active bg-indigo-600 text-white shadow-md shadow-indigo-600/30 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2";
            } else {
                btn.className = "cat-pill bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2";
            }
        });
    },

    async loadProducts() {
        const grid = document.getElementById("products-grid");
        const emptyState = document.getElementById("no-products-state");
        const countDisplay = document.getElementById("product-count-display");
        const filterTag = document.getElementById("active-filter-tag");

        if (!grid) return;

        grid.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-slate-400">
                <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-xs font-semibold">Loading verified products...</span>
            </div>
        `;

        try {
            const params = {
                page: this.currentPage,
                limit: 12,
                sort: this.sortBy
            };
            if (this.selectedCategory) params.category = this.selectedCategory;
            if (this.searchQuery) params.search = this.searchQuery;
            if (this.minPrice !== null) params.min_price = this.minPrice;
            if (this.maxPrice !== null) params.max_price = this.maxPrice;

            const res = await window.api.getProducts(params);
            this.products = res.products || [];
            this.pagination = res.pagination || {};

            if (countDisplay) countDisplay.textContent = this.pagination.total || this.products.length;

            if (filterTag) {
                if (this.searchQuery) {
                    filterTag.textContent = `Search: "${this.searchQuery}"`;
                    filterTag.classList.remove("hidden");
                } else if (this.selectedCategory) {
                    const catObj = this.categories.find(c => c.slug === this.selectedCategory);
                    filterTag.textContent = catObj ? catObj.name : this.selectedCategory;
                    filterTag.classList.remove("hidden");
                } else {
                    filterTag.classList.add("hidden");
                }
            }

            if (this.products.length === 0) {
                grid.innerHTML = "";
                emptyState.classList.remove("hidden");
                return;
            }

            emptyState.classList.add("hidden");
            this.renderProductsGrid(grid);
            this.renderPagination();
        } catch (err) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-rose-400 text-sm">
                    Failed to load products. ${err.message}
                </div>
            `;
        }
    },

    renderProductsGrid(container) {
        let html = "";
        this.products.forEach(p => {
            const discountPct = p.compare_at_price ? Math.round(((p.compare_at_price - p.retail_price) / p.compare_at_price) * 100) : 0;
            const isStockLow = p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0;

            html += `
                <div class="product-card group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-md hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between"
                     data-id="${p.id}" data-slug="${p.slug}">
                    
                    <!-- Card Top Image & Badges -->
                    <div class="relative overflow-hidden aspect-[4/3] bg-slate-900/50 cursor-pointer view-product-trigger">
                        <img src="${p.primary_image}" alt="${p.title}"
                             class="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                             loading="lazy">
                        
                        <!-- Floating Badges -->
                        <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                            ${discountPct > 0 ? `<span class="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-md">-${discountPct}% OFF</span>` : ''}
                            ${p.is_featured ? `<span class="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-md">Featured</span>` : ''}
                        </div>

                        <!-- Wishlist Button -->
                        <button class="wishlist-btn absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-900/70 backdrop-blur border border-slate-700/80 text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition flex items-center justify-center shadow-md z-10"
                                data-id="${p.id}">
                            <i data-lucide="heart" class="w-4 h-4"></i>
                        </button>

                        <!-- Stock status pill overlay -->
                        <div class="absolute bottom-2.5 left-2.5 z-10">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur ${isStockLow ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80' : 'bg-slate-900/80 text-emerald-300 border border-emerald-900/60'}">
                                <i data-lucide="${isStockLow ? 'alert-triangle' : 'check'}" class="w-3 h-3 inline mr-0.5"></i>
                                ${isStockLow ? `Only ${p.stock_quantity} left!` : 'In Stock & Ready'}
                            </span>
                        </div>
                    </div>

                    <!-- Card Body -->
                    <div class="p-4 flex-1 flex flex-col justify-between">
                        <div>
                            <!-- Category & Origin -->
                            <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                                <span class="text-indigo-400 font-semibold uppercase tracking-wider">${p.category_name}</span>
                                <span class="flex items-center gap-1 text-slate-400" title="Origin: ${p.shipping_origin}">
                                    <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i> ${p.shipping_origin.split(',')[0]}
                                </span>
                            </div>

                            <!-- Title -->
                            <h4 class="text-sm font-bold text-white line-clamp-2 hover:text-indigo-400 transition cursor-pointer view-product-trigger mb-2" title="${p.title}">
                                ${p.title}
                            </h4>

                            <!-- Ratings -->
                            <div class="flex items-center gap-1.5 mb-3 text-xs">
                                <div class="flex text-amber-400">
                                    <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                                </div>
                                <span class="font-bold text-white text-xs">${p.rating_avg.toFixed(1)}</span>
                                <span class="text-slate-400 text-[11px]">(${p.rating_count} reviews)</span>
                            </div>
                        </div>

                        <!-- Price & Action Button -->
                        <div class="pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
                            <div>
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-base sm:text-lg font-black text-white">$${p.retail_price.toFixed(2)}</span>
                                    ${p.compare_at_price ? `<span class="text-xs text-slate-500 line-through">$${p.compare_at_price.toFixed(2)}</span>` : ''}
                                </div>
                                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                                    <i data-lucide="clock" class="w-3 h-3 text-cyan-400"></i> Ships in ${p.fulfillment_sla_days}d
                                </div>
                            </div>

                            <button class="quick-add-btn bg-indigo-600/90 hover:bg-indigo-600 text-white p-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 text-xs font-bold"
                                    data-id="${p.id}" data-slug="${p.slug}" title="Add to cart">
                                <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                                <span class="hidden sm:inline">Add</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

        // Card Click Handlers
        container.querySelectorAll(".view-product-trigger").forEach(el => {
            el.addEventListener("click", () => {
                const card = el.closest(".product-card");
                const slug = card.getAttribute("data-slug");
                window.location.hash = `#product/${slug}`;
            });
        });

        // Quick Add Click Handlers
        container.querySelectorAll(".quick-add-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const prodId = btn.getAttribute("data-id");
                const prodSlug = btn.getAttribute("data-slug");
                
                // Fetch product details to check variants
                try {
                    btn.disabled = true;
                    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;
                    const res = await window.api.getProductDetail(prodId);
                    const prod = res.product;

                    if (prod.variants && prod.variants.length > 0) {
                        // Open product modal for variant selection
                        window.ProductDetailModal.open(prod);
                    } else {
                        // Direct add
                        window.appState.addToCart(prod, null, 1);
                    }
                } catch (err) {
                    window.showToast("Could not load product details.", "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="shopping-bag" class="w-4 h-4"></i><span class="hidden sm:inline">Add</span>`;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        });

        // Wishlist Buttons
        container.querySelectorAll(".wishlist-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!window.appState.user) {
                    window.showToast("Please log in to save items to your wishlist.", "info");
                    window.AuthModal.open();
                    return;
                }
                const prodId = btn.getAttribute("data-id");
                try {
                    const res = await window.api.toggleWishlist(prodId);
                    window.showToast(res.message, "success");
                    const icon = btn.querySelector("i");
                    if (res.is_wishlisted) {
                        btn.classList.add("text-rose-500", "bg-rose-500/20");
                    } else {
                        btn.classList.remove("text-rose-500", "bg-rose-500/20");
                    }
                } catch (err) {
                    window.showToast("Failed to update wishlist.", "error");
                }
            });
        });
    },

    renderPagination() {
        const container = document.getElementById("pagination-controls");
        if (!container || !this.pagination.pages || this.pagination.pages <= 1) {
            if (container) container.innerHTML = "";
            return;
        }

        let html = `
            <button id="prev-page-btn" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    ${this.currentPage <= 1 ? 'disabled' : ''}>
                Previous
            </button>
            <span class="text-xs text-slate-400 font-medium px-3">
                Page ${this.currentPage} of ${this.pagination.pages}
            </span>
            <button id="next-page-btn" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    ${this.currentPage >= this.pagination.pages ? 'disabled' : ''}>
                Next
            </button>
        `;
        container.innerHTML = html;

        const prevBtn = container.querySelector("#prev-page-btn");
        const nextBtn = container.querySelector("#next-page-btn");

        if (prevBtn) prevBtn.addEventListener("click", () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadProducts();
                window.scrollTo({ top: 400, behavior: 'smooth' });
            }
        });
        if (nextBtn) nextBtn.addEventListener("click", () => {
            if (this.currentPage < this.pagination.pages) {
                this.currentPage++;
                this.loadProducts();
                window.scrollTo({ top: 400, behavior: 'smooth' });
            }
        });
    }
};
