// Global Reactive State Store for NovaDrop Platform

class StateStore {
    constructor() {
        this.token = localStorage.getItem("novadrop_token") || null;
        this.user = null;
        try {
            this.user = JSON.parse(localStorage.getItem("novadrop_user") || "null");
        } catch (e) {
            this.user = null;
        }

        // Cart persistence
        try {
            this.cart = JSON.parse(localStorage.getItem("novadrop_cart") || "[]");
        } catch (e) {
            this.cart = [];
        }

        this.currency = "$";
        this.appliedCoupon = null;
        this.shippingMethod = "standard";
        this.currentView = "storefront";
        this.selectedProduct = null;
        this.activeAdminTab = "overview";
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    setUser(user, token) {
        this.user = user;
        this.token = token;
        if (token) {
            localStorage.setItem("novadrop_token", token);
            localStorage.setItem("novadrop_user", JSON.stringify(user));
        } else {
            localStorage.removeItem("novadrop_token");
            localStorage.removeItem("novadrop_user");
        }
        this.notify();
    }

    logout() {
        this.setUser(null, null);
        window.location.hash = "#store";
    }

    // Cart Management
    addToCart(product, variant = null, quantity = 1) {
        const itemKey = variant ? `${product.id}-${variant.id}` : `${product.id}-default`;
        const existingIndex = this.cart.findIndex(it => it.key === itemKey);

        const unitPrice = variant ? variant.retail_price : product.retail_price;
        const costPrice = variant ? variant.cost_price : product.cost_price;
        const sku = variant ? variant.sku : product.sku;
        const variantTitle = variant ? variant.title : "";
        const maxStock = variant ? variant.stock_quantity : product.stock_quantity;

        let primaryImg = product.primary_image || (product.images && product.images[0]) || "";

        if (existingIndex > -1) {
            const newQty = this.cart[existingIndex].quantity + quantity;
            if (newQty > maxStock) {
                window.showToast(`Cannot add more. Available stock is ${maxStock}.`, "warning");
                return false;
            }
            this.cart[existingIndex].quantity = newQty;
        } else {
            if (quantity > maxStock) {
                window.showToast(`Cannot add. Available stock is ${maxStock}.`, "warning");
                return false;
            }
            this.cart.push({
                key: itemKey,
                product_id: product.id,
                variant_id: variant ? variant.id : null,
                supplier_id: product.supplier_id,
                title: product.title,
                variant_title: variantTitle,
                sku: sku,
                unit_price: unitPrice,
                cost_price: costPrice,
                quantity: quantity,
                max_stock: maxStock,
                image: primaryImg,
                slug: product.slug
            });
        }

        this.saveCart();
        window.showToast(`Added "${product.title}" to your cart!`, "success");
        return true;
    }

    updateCartQuantity(key, newQty) {
        const index = this.cart.findIndex(it => it.key === key);
        if (index > -1) {
            if (newQty <= 0) {
                this.cart.splice(index, 1);
            } else {
                if (newQty > this.cart[index].max_stock) {
                    window.showToast(`Maximum available stock is ${this.cart[index].max_stock}.`, "warning");
                    return;
                }
                this.cart[index].quantity = newQty;
            }
            this.saveCart();
        }
    }

    removeFromCart(key) {
        this.cart = this.cart.filter(it => it.key !== key);
        this.saveCart();
        window.showToast("Item removed from cart.", "info");
    }

    clearCart() {
        this.cart = [];
        this.appliedCoupon = null;
        this.saveCart();
    }

    saveCart() {
        localStorage.setItem("novadrop_cart", JSON.stringify(this.cart));
        this.notify();
    }

    getCartSubtotal() {
        return this.cart.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    }

    getCartItemCount() {
        return this.cart.reduce((cnt, it) => cnt + it.quantity, 0);
    }
}

window.appState = new StateStore();
