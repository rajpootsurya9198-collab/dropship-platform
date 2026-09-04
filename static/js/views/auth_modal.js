// Authentication Modal & 1-Click Role Switcher

window.AuthModal = {
    mode: "login", // login or register

    open(initialMode = "login") {
        this.mode = initialMode;
        let modal = document.getElementById("auth-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "auth-modal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop";
            document.body.appendChild(modal);
        }

        this.renderModal(modal);
    },

    close() {
        const modal = document.getElementById("auth-modal");
        if (modal) modal.classList.add("hidden");
    },

    async quickSwitchRole(role) {
        try {
            const res = await window.api.switchDemoRole(role);
            window.appState.setUser(res.user, res.token);
            window.showToast(res.message, "success");
            this.close();
            
            if (role === "admin" || role === "merchant" || role === "supplier") {
                window.location.hash = "#admin";
            } else {
                window.location.hash = "#store";
            }
        } catch (err) {
            window.showToast(err.message, "error");
        }
    },

    renderModal(modal) {
        modal.innerHTML = `
            <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30">
                            N
                        </div>
                        <span class="text-base font-black text-white">NovaDrop Direct</span>
                    </div>
                    <button id="close-auth-modal-btn" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- 1-Click Fast Role Switcher Box -->
                <div class="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-2">
                    <div class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                        <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i> Instant 1-Click Demo Login:
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="role-switch-btn p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700 text-left flex flex-col"
                                data-role="admin">
                            <span class="text-[10px] text-indigo-400 font-mono">👑 SUPERADMIN</span>
                            <span class="text-xs">Marcus Vance</span>
                        </button>
                        <button class="role-switch-btn p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700 text-left flex flex-col"
                                data-role="merchant">
                            <span class="text-[10px] text-cyan-400 font-mono">💼 DROPSHIPPER</span>
                            <span class="text-xs">Elena Rostova</span>
                        </button>
                        <button class="role-switch-btn p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700 text-left flex flex-col"
                                data-role="supplier">
                            <span class="text-[10px] text-amber-400 font-mono">🏭 SUPPLIER</span>
                            <span class="text-xs">Chen Wei (Apex)</span>
                        </button>
                        <button class="role-switch-btn p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700 text-left flex flex-col"
                                data-role="customer">
                            <span class="text-[10px] text-emerald-400 font-mono">🛍️ SHOPPER</span>
                            <span class="text-xs">Sophia Martinez</span>
                        </button>
                    </div>
                </div>

                <!-- Mode Tabs -->
                <div class="flex border-b border-slate-800 gap-4">
                    <button id="auth-tab-login" class="pb-2.5 text-xs font-bold ${this.mode === 'login' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'} transition">
                        Sign In with Email
                    </button>
                    <button id="auth-tab-register" class="pb-2.5 text-xs font-bold ${this.mode === 'register' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'} transition">
                        Create New Account
                    </button>
                </div>

                <!-- Form Inputs -->
                <div class="space-y-3">
                    ${this.mode === 'register' ? `
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Full Name *</label>
                            <input type="text" id="auth-name-input" placeholder="e.g. Alex Hunter"
                                   class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">Account Role</label>
                            <select id="auth-role-input" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white">
                                <option value="customer">Customer / Buyer</option>
                                <option value="merchant">Dropship Merchant / Reseller</option>
                            </select>
                        </div>
                    ` : ''}

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Email Address *</label>
                        <input type="email" id="auth-email-input" value="${this.mode === 'login' ? 'customer@example.com' : ''}" placeholder="name@example.com"
                               class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Password *</label>
                        <input type="password" id="auth-password-input" value="${this.mode === 'login' ? 'Customer123!' : ''}" placeholder="••••••••"
                               class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <button id="auth-submit-btn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs pt-3 mt-4">
                        ${this.mode === 'login' ? 'Sign In to Account' : 'Complete Registration'}
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();

        // Bind events
        modal.querySelector("#close-auth-modal-btn").addEventListener("click", () => this.close());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) this.close();
        });

        modal.querySelectorAll(".role-switch-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const role = btn.getAttribute("data-role");
                this.quickSwitchRole(role);
            });
        });

        const tabLogin = modal.querySelector("#auth-tab-login");
        const tabRegister = modal.querySelector("#auth-tab-register");
        tabLogin.addEventListener("click", () => { this.mode = "login"; this.renderModal(modal); });
        tabRegister.addEventListener("click", () => { this.mode = "register"; this.renderModal(modal); });

        const submitBtn = modal.querySelector("#auth-submit-btn");
        submitBtn.addEventListener("click", async () => {
            const email = modal.querySelector("#auth-email-input").value.trim();
            const password = modal.querySelector("#auth-password-input").value.trim();

            if (!email || !password) {
                window.showToast("Email and password are required.", "warning");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

                if (this.mode === "login") {
                    const res = await window.api.login(email, password);
                    window.appState.setUser(res.user, res.token);
                    window.showToast(`Welcome back, ${res.user.full_name}!`, "success");
                } else {
                    const fullName = modal.querySelector("#auth-name-input").value.trim();
                    const role = modal.querySelector("#auth-role-input").value;
                    const res = await window.api.register({ email, password, full_name: fullName, role });
                    window.appState.setUser(res.user, res.token);
                    window.showToast(`Account created! Welcome, ${res.user.full_name}.`, "success");
                }
                this.close();
            } catch (err) {
                window.showToast(err.message, "error");
                submitBtn.disabled = false;
                submitBtn.textContent = this.mode === "login" ? "Sign In to Account" : "Complete Registration";
            }
        });
    }
};
