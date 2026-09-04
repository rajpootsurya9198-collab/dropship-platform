// API Service Client for NovaDrop Platform

class ApiClient {
    constructor() {
        this.baseUrl = "/api";
    }

    getHeaders() {
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        const token = window.appState ? window.appState.token : localStorage.getItem("novadrop_token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.getHeaders();

        const config = {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        };

        if (options.body && typeof options.body === "object") {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
                if (response.status === 401 && window.appState && window.appState.token) {
                    window.showToast("Session expired. Please log in again.", "warning");
                    window.appState.logout();
                }
                throw new Error(errorMsg);
            }

            return data;
        } catch (err) {
            console.error(`API Error on ${endpoint}:`, err);
            throw err;
        }
    }

    // --- AUTH ---
    login(email, password) {
        return this.request("/auth/login", { method: "POST", body: { email, password } });
    }
    register(payload) {
        return this.request("/auth/register", { method: "POST", body: payload });
    }
    getMe() {
        return this.request("/auth/me");
    }
    updateProfile(payload) {
        return this.request("/auth/profile", { method: "PUT", body: payload });
    }
    switchDemoRole(role) {
        return this.request("/auth/switch-demo-role", { method: "POST", body: { role } });
    }

    // --- STOREFRONT ---
    getCategories() {
        return this.request("/store/categories");
    }
    getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/store/products?${query}`);
    }
    getProductDetail(idOrSlug) {
        return this.request(`/store/products/${idOrSlug}`);
    }
    getProductReviews(productId) {
        return this.request(`/store/reviews/${productId}`);
    }
    submitReview(productId, payload) {
        return this.request(`/store/reviews/${productId}`, { method: "POST", body: payload });
    }
    getWishlist() {
        return this.request("/store/wishlist");
    }
    toggleWishlist(productId) {
        return this.request("/store/wishlist/toggle", { method: "POST", body: { product_id: productId } });
    }

    // --- CHECKOUT ---
    validateCoupon(code, subtotal) {
        return this.request("/checkout/validate-coupon", { method: "POST", body: { code, subtotal } });
    }
    calculateShipping(subtotal, shippingMethod) {
        return this.request("/checkout/calculate-shipping", { method: "POST", body: { subtotal, shipping_method: shippingMethod } });
    }
    placeOrder(payload) {
        return this.request("/checkout/place-order", { method: "POST", body: payload });
    }

    // --- ORDERS & TRACKING ---
    getMyOrders() {
        return this.request("/orders/my-orders");
    }
    getOrderDetail(orderNumber) {
        return this.request(`/orders/${orderNumber}`);
    }
    cancelOrder(orderNumber, reason) {
        return this.request(`/orders/${orderNumber}/cancel`, { method: "POST", body: { reason } });
    }
    requestRefund(orderNumber, payload) {
        return this.request(`/orders/${orderNumber}/request-refund`, { method: "POST", body: payload });
    }
    trackPackage(query) {
        return this.request(`/tracking/search?query=${encodeURIComponent(query)}`);
    }

    // --- CUSTOMER ---
    getAddresses() {
        return this.request("/customer/addresses");
    }
    createAddress(payload) {
        return this.request("/customer/addresses", { method: "POST", body: payload });
    }
    updateAddress(id, payload) {
        return this.request(`/customer/addresses/${id}`, { method: "PUT", body: payload });
    }
    deleteAddress(id) {
        return this.request(`/customer/addresses/${id}`, { method: "DELETE" });
    }
    setDefaultAddress(id) {
        return this.request(`/customer/addresses/${id}/set-default`, { method: "POST" });
    }

    // --- ADMIN & MERCHANT ---
    getAdminProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/products?${query}`);
    }
    createProduct(payload) {
        return this.request("/admin/products", { method: "POST", body: payload });
    }
    getProductForEdit(id) {
        return this.request(`/admin/products/${id}`);
    }
    updateProduct(id, payload) {
        return this.request(`/admin/products/${id}`, { method: "PUT", body: payload });
    }
    deleteProduct(id) {
        return this.request(`/admin/products/${id}`, { method: "DELETE" });
    }
    adjustStock(id, stockQuantity) {
        return this.request(`/admin/products/${id}/stock`, { method: "POST", body: { stock_quantity: stockQuantity } });
    }
    applyBulkMarkup(payload) {
        return this.request("/admin/products/bulk-markup", { method: "POST", body: payload });
    }
    getAdminCategories() {
        return this.request("/admin/categories");
    }
    createCategory(payload) {
        return this.request("/admin/categories", { method: "POST", body: payload });
    }
    updateCategory(id, payload) {
        return this.request(`/admin/categories/${id}`, { method: "PUT", body: payload });
    }
    deleteCategory(id) {
        return this.request(`/admin/categories/${id}`, { method: "DELETE" });
    }

    getAdminOrders(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/orders?${query}`);
    }
    getAdminOrderDetail(id) {
        return this.request(`/admin/orders/${id}`);
    }
    updateOrderStatus(id, status) {
        return this.request(`/admin/orders/${id}/status`, { method: "PUT", body: { status } });
    }
    fulfillOrder(id, payload) {
        return this.request(`/admin/orders/${id}/fulfill`, { method: "POST", body: payload });
    }
    addTrackingCheckpoint(id, payload) {
        return this.request(`/admin/orders/${id}/add-checkpoint`, { method: "POST", body: payload });
    }

    getAdminSuppliers() {
        return this.request("/admin/suppliers");
    }
    createSupplier(payload) {
        return this.request("/admin/suppliers", { method: "POST", body: payload });
    }
    updateSupplier(id, payload) {
        return this.request(`/admin/suppliers/${id}`, { method: "PUT", body: payload });
    }
    deleteSupplier(id) {
        return this.request(`/admin/suppliers/${id}`, { method: "DELETE" });
    }

    getAdminCoupons() {
        return this.request("/admin/coupons");
    }
    createCoupon(payload) {
        return this.request("/admin/coupons", { method: "POST", body: payload });
    }
    updateCoupon(id, payload) {
        return this.request(`/admin/coupons/${id}`, { method: "PUT", body: payload });
    }
    deleteCoupon(id) {
        return this.request(`/admin/coupons/${id}`, { method: "DELETE" });
    }
    toggleCoupon(id) {
        return this.request(`/admin/coupons/${id}/toggle`, { method: "POST" });
    }

    getAdminReviews(status = "") {
        return this.request(`/admin/reviews?status=${status}`);
    }
    updateReviewStatus(id, status) {
        return this.request(`/admin/reviews/${id}/status`, { method: "PUT", body: { status } });
    }
    deleteReview(id) {
        return this.request(`/admin/reviews/${id}`, { method: "DELETE" });
    }
    replyReview(id, reply) {
        return this.request(`/admin/reviews/${id}/reply`, { method: "POST", body: { reply } });
    }

    getAdminRefunds() {
        return this.request("/admin/refunds");
    }
    updateRefundStatus(id, payload) {
        return this.request(`/admin/refunds/${id}/status`, { method: "PUT", body: payload });
    }

    getAdminAnalytics() {
        return this.request("/admin/analytics/overview");
    }
    getSalesTrend() {
        return this.request("/admin/analytics/sales-trend");
    }
    getCategoryBreakdown() {
        return this.request("/admin/analytics/category-breakdown");
    }
    getTopProducts() {
        return this.request("/admin/analytics/top-products");
    }

    getAdminSettings() {
        return this.request("/admin/settings");
    }
    saveAdminSettings(payload) {
        return this.request("/admin/settings", { method: "POST", body: payload });
    }
    getMarkupRules() {
        return this.request("/admin/markup-rules");
    }
    createMarkupRule(payload) {
        return this.request("/admin/markup-rules", { method: "POST", body: payload });
    }
    deleteMarkupRule(id) {
        return this.request(`/admin/markup-rules/${id}`, { method: "DELETE" });
    }

    getAdminUsers(role = "") {
        return this.request(`/admin/users?role=${role}`);
    }
    createAdminUser(payload) {
        return this.request("/admin/users", { method: "POST", body: payload });
    }
    updateAdminUser(id, payload) {
        return this.request(`/admin/users/${id}`, { method: "PUT", body: payload });
    }
    deleteAdminUser(id) {
        return this.request(`/admin/users/${id}`, { method: "DELETE" });
    }
    getAuditLogs() {
        return this.request("/admin/audit-logs");
    }
}

window.api = new ApiClient();
