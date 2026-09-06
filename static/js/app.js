// Main Application Controller, Router & UI Coordinator

// Toast Notification Manager
window.showToast = function(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColors = {
        success: "bg-slate-900 border-emerald-500/50 text-emerald-300",
        error: "bg-slate-900 border-rose-500/50 text-rose-300",
        warning: "bg-slate-900 border-amber-500/50 text-amber-300",
        info: "bg-slate-900 border-indigo-500/50 text-indigo-300"
    };
    const iconNames = {
        success: "check-circle",
        error: "alert-circle",
        warning: "alert-triangle",
        info: "info"
    };

    toast.className = `toast px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold max-w-md ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
        <i data-lucide="${iconNames[type] || 'info'}" class="w-4 h-4 flex-shrink-0"></i>
        <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s, transform 0.3s";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// Application Router
class AppRouter {
    constructor() {
        this.container = document.getElementById("view-container");
        this.init();
    }

    init() {
        window.addEventListener("hashchange", () => this.handleRoute());
        window.appState.subscribe(() => this.updateNavbar());
        this.updateNavbar();
        this.handleRoute();
    }

    updateNavbar() {
        const user = window.appState.user;
        const cartCount = window.appState.getCartItemCount();

        // Update Cart Count Badge
        const cartBadges = document.querySelectorAll(".cart-badge-count");
        cartBadges.forEach(b => {
            b.textContent = cartCount;
            if (cartCount > 0) b.classList.remove("hidden");
            else b.classList.add("hidden");
        });

        // Update Auth State in Navbar
        const authContainer = document.getElementById("nav-auth-container");
        if (authContainer) {
            if (user) {
                authContainer.innerHTML = `
                    <div class="flex items-center gap-3">
                        ${user.role === 'admin' || user.role === 'merchant' || user.role === 'supplier' ? `
                            <a href="#admin" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition">
                                <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i> Management Hub
                            </a>
                        ` : ''}
                        <a href="#account" class="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white transition">
                            <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-8 h-8 rounded-xl object-cover border border-indigo-500/50">
                            <div class="hidden md:block text-left">
                                <div class="font-bold text-white">${user.full_name.split(' ')[0]}</div>
                                <div class="text-[10px] text-indigo-400 uppercase font-mono">${user.role}</div>
                            </div>
                        </a>
                    </div>
                `;
            } else {
                authContainer.innerHTML = `
                    <button id="nav-login-btn" onclick="window.AuthModal.open()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5">
                        <i data-lucide="user" class="w-3.5 h-3.5"></i> Sign In / Register
                    </button>
                `;
            }
            if (window.lucide) window.lucide.createIcons();
        }
    }

    async handleRoute() {
        const hash = window.location.hash || "#store";
        const container = document.getElementById("view-container");
        if (!container) return;

        // Highlight active nav item
        document.querySelectorAll(".nav-link").forEach(link => {
            const href = link.getAttribute("href");
            if (href && hash.startsWith(href)) {
                link.classList.add("text-indigo-400", "font-bold");
                link.classList.remove("text-slate-300");
            } else {
                link.classList.remove("text-indigo-400", "font-bold");
                link.classList.add("text-slate-300");
            }
        });

        if (hash.startsWith("#product/")) {
            const param = hash.replace("#product/", "").split("?")[0];
            if (container.children.length === 0) {
                await window.StorefrontView.render(container);
            }
            window.ProductDetailModal.open(param);
        } else if (hash.startsWith("#cart") || hash.startsWith("#checkout")) {
            await window.CartCheckoutView.render(container);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (hash.startsWith("#tracking")) {
            await window.OrderTrackingView.render(container);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (hash.startsWith("#account")) {
            await window.CustomerAccountView.render(container);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (hash.startsWith("#admin")) {
            await window.AdminDashboardView.render(container);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Default Storefront
            await window.StorefrontView.render(container);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    window.router = new AppRouter();

    // Verify session validity on initial boot (cleanly logs out if JWT is expired/invalid)
    if (window.appState && window.appState.token && window.api) {
        try {
            const meRes = await window.api.getMe();
            if (meRes && meRes.user) {
                window.appState.setUser(meRes.user, window.appState.token);
            }
        } catch (err) {
            // ApiClient 401 interceptor automatically clears token, resets state and notifies UI
            console.warn("Session expired or invalid on boot:", err.message);
        }
    }
});
