/**
 * NovaDrop Enterprise Frontend Configuration
 * 
 * Supports seamless switching between:
 * - Local Development: http://localhost:5000/api (or relative /api)
 * - Production: Configurable Flask API backend URL (e.g. https://your-backend-domain.onrender.com/api)
 * 
 * You can set the production backend URL in one of three ways:
 * 1. Edit `API_BASE_URL` below in this file.
 * 2. Set it dynamically at runtime via localStorage ('novadrop_api_url').
 * 3. Pass it in the URL query string: ?api_url=https://your-backend.com/api
 */

(function() {
    const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]' ||
        window.location.port === '5000' ||
        window.location.protocol === 'file:'
    );

    window.NOVADROP_CONFIG = {
        // PRODUCTION BACKEND URL
        // Set your deployed Flask API URL here before pushing to GitHub Pages:
        // Example: "https://novadrop-api.onrender.com/api"
        API_BASE_URL: "",

        APP_NAME: "NovaDrop",
        VERSION: "2.1.0-production",
        IS_LOCAL: isLocalhost,

        /**
         * Resolves the active API base URL in order of precedence:
         * 1. URL Query Parameter (?api_url=...)
         * 2. Browser localStorage override ('novadrop_api_url')
         * 3. Static config file setting (API_BASE_URL)
         * 4. Relative '/api' (Local development default)
         */
        getApiBaseUrl: function() {
            // 1. URL Query parameter check
            try {
                const params = new URLSearchParams(window.location.search);
                const queryApi = params.get('api_url');
                if (queryApi && queryApi.trim()) {
                    const clean = queryApi.trim().replace(/\/+$/, '');
                    localStorage.setItem('novadrop_api_url', clean);
                    return clean;
                }
            } catch (e) {}

            // 2. localStorage override check
            try {
                const saved = localStorage.getItem('novadrop_api_url');
                if (saved && saved.trim()) {
                    return saved.trim().replace(/\/+$/, '');
                }
            } catch (e) {}

            // 3. Static config setting check
            if (this.API_BASE_URL && this.API_BASE_URL.trim()) {
                return this.API_BASE_URL.trim().replace(/\/+$/, '');
            }

            // 4. Default for localhost / same-origin Flask serving
            if (isLocalhost) {
                return "/api";
            }

            // Fallback for GitHub Pages when not yet configured
            return "/api";
        },

        /**
         * Saves or clears the production backend API URL in localStorage.
         */
        setApiBaseUrl: function(url) {
            if (url && url.trim()) {
                const clean = url.trim().replace(/\/+$/, '');
                localStorage.setItem('novadrop_api_url', clean);
                if (window.api && typeof window.api.updateBaseUrl === "function") {
                    window.api.updateBaseUrl();
                }
                return clean;
            } else {
                localStorage.removeItem('novadrop_api_url');
                if (window.api && typeof window.api.updateBaseUrl === "function") {
                    window.api.updateBaseUrl();
                }
                return "/api";
            }
        },

        /**
         * Checks if the frontend has a valid target backend configured.
         */
        isConfigured: function() {
            if (isLocalhost) return true;
            const current = this.getApiBaseUrl();
            return (current && current !== "/api" && (current.startsWith("http://") || current.startsWith("https://")));
        },

        /**
         * Tests connectivity to a given backend base URL.
         */
        testConnection: async function(candidateUrl) {
            let base = (candidateUrl || this.getApiBaseUrl()).trim().replace(/\/+$/, '');
            let healthUrl = base.endsWith("/api") ? `${base}/health` : `${base}/api/health`;
            try {
                const resp = await fetch(healthUrl, { method: "GET", headers: { "Accept": "application/json" } });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                return { success: true, data: data };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
    };

    // Modal & UI Helper for configuring API Backend
    window.BackendConfigModal = {
        getModalElement: function() {
            let modal = document.getElementById("backend-config-modal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "backend-config-modal";
                modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden";
                modal.innerHTML = `
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                                </div>
                                <div>
                                    <h3 class="text-base font-bold text-white">Backend REST API Configuration</h3>
                                    <p class="text-xs text-slate-400">Connect this static frontend to your deployed Flask backend</p>
                                </div>
                            </div>
                            <button onclick="window.BackendConfigModal.close()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Flask API Base URL</label>
                                <input type="url" id="backend-api-input" placeholder="https://your-flask-api.onrender.com/api" 
                                    class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono">
                                <p class="text-[11px] text-slate-400 mt-1">Example: <code class="text-indigo-300">https://novadrop-api.onrender.com/api</code> or <code class="text-indigo-300">http://localhost:5000/api</code></p>
                            </div>

                            <div id="backend-test-result" class="hidden p-3 rounded-xl text-xs space-y-1"></div>

                            <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                                <div class="font-semibold text-slate-300 flex items-center gap-1.5">
                                    <span>Deployment Checklist:</span>
                                </div>
                                <ul class="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                                    <li>Backend deployed on Render, Railway, or Fly.io</li>
                                    <li>CORS configured with your GitHub Pages URL</li>
                                    <li>PostgreSQL connected via <code class="text-indigo-300">DATABASE_URL</code></li>
                                </ul>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                            <button onclick="window.BackendConfigModal.reset()" class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition">
                                Reset to Default
                            </button>
                            <div class="flex items-center gap-2">
                                <button id="btn-test-connection" onclick="window.BackendConfigModal.test()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5">
                                    Test Health
                                </button>
                                <button onclick="window.BackendConfigModal.save()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30">
                                    Save & Connect
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            return modal;
        },

        open: function() {
            const modal = this.getModalElement();
            const input = document.getElementById("backend-api-input");
            const resultBox = document.getElementById("backend-test-result");
            if (resultBox) resultBox.className = "hidden";
            
            const current = localStorage.getItem("novadrop_api_url") || window.NOVADROP_CONFIG.API_BASE_URL || "";
            if (input) input.value = current;

            modal.classList.remove("hidden");
        },

        close: function() {
            const modal = document.getElementById("backend-config-modal");
            if (modal) modal.classList.add("hidden");
        },

        test: async function() {
            const input = document.getElementById("backend-api-input");
            const resultBox = document.getElementById("backend-test-result");
            const testBtn = document.getElementById("btn-test-connection");
            if (!input || !resultBox) return;

            const url = input.value.trim();
            if (!url) {
                resultBox.className = "p-3 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300";
                resultBox.innerHTML = "⚠️ Please enter an API URL to test.";
                return;
            }

            testBtn.disabled = true;
            testBtn.innerText = "Testing...";
            resultBox.className = "p-3 rounded-xl text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300";
            resultBox.innerHTML = "Connecting to " + url + "...";

            const res = await window.NOVADROP_CONFIG.testConnection(url);
            testBtn.disabled = false;
            testBtn.innerText = "Test Health";

            if (res.success) {
                const d = res.data;
                resultBox.className = "p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300";
                resultBox.innerHTML = `
                    <div class="font-bold flex items-center gap-1.5">
                        <span>✅ Successfully Connected to Flask Backend</span>
                    </div>
                    <div class="text-[11px] text-emerald-400 font-mono mt-1">
                        Status: ${d.status || 'healthy'} | Database: ${typeof d.database === 'object' ? (d.database?.engine || 'connected') : (d.database || 'connected')} | Version: ${d.version || '2.1.0'}
                    </div>
                `;
            } else {
                resultBox.className = "p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300";
                resultBox.innerHTML = `
                    <div class="font-bold flex items-center gap-1.5">
                        <span>❌ Connection Failed</span>
                    </div>
                    <div class="text-[11px] text-rose-300 mt-1">
                        ${res.error}. Make sure the backend server is running and CORS allows this origin.
                    </div>
                `;
            }
        },

        save: function() {
            const input = document.getElementById("backend-api-input");
            if (!input) return;
            const url = input.value.trim();
            window.NOVADROP_CONFIG.setApiBaseUrl(url);
            this.close();
            if (window.showToast) {
                window.showToast(url ? `Connected to API: ${url}` : "Reset to default relative API", "success");
            }
            window.BackendConfigModal.updateStatusIndicator();
            // Trigger router refresh
            if (window.router && typeof window.router.handleRoute === "function") {
                window.router.handleRoute();
            }
        },

        reset: function() {
            window.NOVADROP_CONFIG.setApiBaseUrl("");
            const input = document.getElementById("backend-api-input");
            if (input) input.value = "";
            this.close();
            if (window.showToast) {
                window.showToast("Reset API Base URL to default", "info");
            }
            window.BackendConfigModal.updateStatusIndicator();
            if (window.router && typeof window.router.handleRoute === "function") {
                window.router.handleRoute();
            }
        },

        updateStatusIndicator: function() {
            const label = document.getElementById("backend-status-label");
            const dot = document.getElementById("backend-status-dot");
            const banner = document.getElementById("github-pages-banner");
            const isLocal = window.NOVADROP_CONFIG.IS_LOCAL;
            const configured = window.NOVADROP_CONFIG.isConfigured();
            const current = window.NOVADROP_CONFIG.getApiBaseUrl();

            if (label) {
                if (configured) {
                    label.textContent = "API: Connected";
                } else if (isLocal) {
                    label.textContent = "API: Localhost";
                } else {
                    label.textContent = "API: Setup Needed";
                }
            }

            if (dot) {
                dot.className = configured || isLocal ? "w-2 h-2 rounded-full bg-emerald-400" : "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
            }

            if (banner) {
                if (!isLocal && !configured) {
                    banner.classList.remove("hidden");
                } else {
                    banner.classList.add("hidden");
                }
            }
        }
    };

    window.showBackendSetupModal = function() {
        window.BackendConfigModal.open();
    };

    // Auto-initialize indicator on page load
    document.addEventListener("DOMContentLoaded", function() {
        setTimeout(function() {
            window.BackendConfigModal.updateStatusIndicator();
        }, 200);
    });
})();
