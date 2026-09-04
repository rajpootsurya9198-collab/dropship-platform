// Order Tracking Portal View: Real-time Multi-Carrier Milestone Tracker

window.OrderTrackingView = {
    searchQuery: "",
    trackingResult: null,
    loading: false,

    async render(container) {
        // Check URL query parameters for auto-search e.g. #tracking?order=ORD-88201
        const hash = window.location.hash;
        if (hash.includes("?")) {
            const queryPart = hash.split("?")[1];
            const params = new URLSearchParams(queryPart);
            const orderParam = params.get("order") || params.get("num") || params.get("query");
            if (orderParam) {
                this.searchQuery = orderParam;
            }
        }

        container.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 py-10 space-y-8">
                <!-- Search Box Header -->
                <div class="text-center space-y-4">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                        <i data-lucide="satellite" class="w-3.5 h-3.5"></i> Global Multi-Carrier Tracking
                    </div>
                    <h1 class="text-3xl sm:text-4xl font-black text-white">Live Package Tracker</h1>
                    <p class="text-sm text-slate-400 max-w-md mx-auto">
                        Enter your Order Number (e.g. <strong class="text-indigo-400 font-mono">ORD-88201</strong>) or Carrier Tracking Number (e.g. <strong class="text-indigo-400 font-mono">YUN-882910482US</strong>) to view real-time transit checkpoints.
                    </p>

                    <!-- Search Input Bar -->
                    <div class="max-w-xl mx-auto relative pt-2">
                        <div class="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 transition">
                            <i data-lucide="search" class="w-5 h-5 text-slate-400 ml-3 mr-2"></i>
                            <input type="text" id="track-search-input" value="${this.searchQuery}" placeholder="Enter ORD-XXXXX or tracking number..."
                                   class="w-full bg-transparent text-white text-sm focus:outline-none placeholder-slate-400 py-2">
                            <button id="track-search-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition shadow-md flex items-center gap-1.5">
                                Track
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tracking Results Container -->
                <div id="tracking-result-container">
                    <!-- Tracking details injected here -->
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.bindEvents(container);

        if (this.searchQuery) {
            await this.performTrack(this.searchQuery);
        } else {
            // Render sample search prompt
            this.renderSampleDemo();
        }
    },

    bindEvents(container) {
        const input = container.querySelector("#track-search-input");
        const btn = container.querySelector("#track-search-btn");

        const doSearch = () => {
            const val = input.value.trim();
            if (val) {
                this.searchQuery = val;
                this.performTrack(val);
            }
        };

        btn.addEventListener("click", doSearch);
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") doSearch();
        });
    },

    async performTrack(query) {
        const container = document.getElementById("tracking-result-container");
        if (!container) return;

        container.innerHTML = `
            <div class="py-16 text-center text-slate-400 space-y-3">
                <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div class="text-xs font-semibold">Connecting to carrier logistics API...</div>
            </div>
        `;

        try {
            const res = await window.api.trackPackage(query);
            this.trackingResult = res;
            this.renderTrackingDetails(container, res);
        } catch (err) {
            container.innerHTML = `
                <div class="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-4">
                    <div class="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                        <i data-lucide="alert-circle" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-base font-bold text-white">Tracking Number Not Found</h3>
                    <p class="text-xs text-slate-400 max-w-sm mx-auto">${err.message}</p>
                    <div class="text-xs text-slate-400 pt-2">
                        Try demo numbers: <button class="text-indigo-400 underline font-mono font-bold" onclick="window.OrderTrackingView.performTrack('ORD-88201')">ORD-88201</button> (Delivered) or <button class="text-indigo-400 underline font-mono font-bold" onclick="window.OrderTrackingView.performTrack('ORD-88202')">ORD-88202</button> (In Transit)
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    renderTrackingDetails(container, data) {
        if (data.type === "order") {
            // Multiple fulfillments order
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div class="text-xs text-slate-400">Order Number</div>
                            <div class="text-xl font-black text-white font-mono">${data.order_number}</div>
                            <div class="text-xs text-slate-400 mt-1">Recipient: <strong class="text-slate-200">${data.customer_name}</strong> • Destination: <strong class="text-slate-200">${data.destination}</strong></div>
                        </div>
                        <span class="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${data.order_status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}">
                            ${data.order_status.toUpperCase()}
                        </span>
                    </div>

                    ${data.fulfillments.map((ful, idx) => `
                        <div class="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-md space-y-6">
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                                <div>
                                    <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Package #${idx + 1} (${ful.carrier})</div>
                                    <div class="text-sm font-bold text-white font-mono mt-0.5">Tracking #: ${ful.tracking_number}</div>
                                    <div class="text-xs text-slate-400">Shipped from: ${ful.shipping_origin}</div>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold ${ful.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'}">
                                    ${ful.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>

                            <!-- Timeline -->
                            <div class="space-y-4 pl-2">
                                ${ful.events.map((ev, eIdx) => `
                                    <div class="timeline-step ${eIdx === ful.events.length - 1 ? 'completed' : 'completed'} flex items-start gap-4">
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${eIdx === ful.events.length - 1 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-700 text-slate-300'} z-10 flex-shrink-0">
                                            <i data-lucide="${eIdx === ful.events.length - 1 ? 'map-pin' : 'check'}" class="w-4 h-4"></i>
                                        </div>
                                        <div class="pt-1.5 space-y-1">
                                            <div class="text-xs font-bold text-white">${ev.description}</div>
                                            <div class="text-[11px] text-slate-400 flex items-center gap-2">
                                                <span><i data-lucide="map-pin" class="w-3 h-3 inline text-slate-500"></i> ${ev.location}</span>
                                                <span>•</span>
                                                <span><i data-lucide="clock" class="w-3 h-3 inline text-slate-500"></i> ${ev.checkpoint_time}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Single fulfillment view
            const ful = data;
            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Progress Card -->
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-xl space-y-6">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-bold">${ful.carrier}</span>
                                    <span class="text-xs font-mono text-slate-400 font-bold">${ful.carrier_service}</span>
                                </div>
                                <div class="text-2xl font-black text-white font-mono mt-1">${ful.tracking_number}</div>
                                <div class="text-xs text-slate-400 mt-1">Associated Order: <strong class="text-indigo-400 font-mono">${ful.order_number}</strong></div>
                            </div>
                            <div class="text-left sm:text-right">
                                <div class="text-xs text-slate-400">Current Status</div>
                                <div class="text-base font-black ${ful.status === 'delivered' ? 'text-emerald-400' : 'text-cyan-400'} uppercase tracking-wide">
                                    ${ful.status.replace('_', ' ')}
                                </div>
                                ${ful.estimated_delivery_at ? `<div class="text-[11px] text-slate-400 mt-0.5">Est. Delivery: <strong>${ful.estimated_delivery_at.split(' ')[0]}</strong></div>` : ''}
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-bold text-slate-300">
                                <span>Origin: ${ful.origin.split(',')[0]}</span>
                                <span class="text-indigo-400">${ful.progress_percent}% in transit</span>
                                <span>Destination: ${ful.destination}</span>
                            </div>
                            <div class="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-700/80">
                                <div class="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-3 rounded-full transition-all duration-700" style="width: ${ful.progress_percent}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Milestones Timeline -->
                    <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-6">
                        <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                            <i data-lucide="route" class="w-4 h-4 text-indigo-400"></i> Detailed Transit Checkpoints (${ful.events.length})
                        </h3>

                        <div class="space-y-6 pl-2">
                            ${ful.events.slice().reverse().map((ev, idx) => {
                                const isLatest = idx === 0;
                                return `
                                    <div class="timeline-step completed flex items-start gap-4">
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${isLatest ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-lg' : 'bg-slate-700 text-slate-300'} z-10 flex-shrink-0">
                                            <i data-lucide="${isLatest ? 'map-pin' : 'check'}" class="w-4 h-4"></i>
                                        </div>
                                        <div class="pt-1 space-y-1">
                                            <div class="text-sm font-bold ${isLatest ? 'text-emerald-400' : 'text-white'}">${ev.description}</div>
                                            <div class="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                                                <span class="font-medium text-slate-300"><i data-lucide="map-pin" class="w-3 h-3 inline text-slate-500"></i> ${ev.location}</span>
                                                <span>•</span>
                                                <span><i data-lucide="clock" class="w-3 h-3 inline text-slate-500"></i> ${ev.checkpoint_time}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        if (window.lucide) window.lucide.createIcons();
    },

    renderSampleDemo() {
        const container = document.getElementById("tracking-result-container");
        if (!container) return;

        container.innerHTML = `
            <div class="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-4">
                <div class="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                    <i data-lucide="truck" class="w-7 h-7"></i>
                </div>
                <h3 class="text-base font-bold text-white">Track Your Shipment Instantly</h3>
                <p class="text-xs text-slate-400 max-w-md mx-auto">
                    Check live milestones, customs clearance status, and local carrier courier handoffs in real time.
                </p>
                <div class="flex flex-wrap justify-center gap-3 pt-2">
                    <button class="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-mono text-indigo-300 font-bold transition flex items-center gap-1.5"
                            onclick="window.OrderTrackingView.performTrack('ORD-88201')">
                        <i data-lucide="play" class="w-3 h-3"></i> Try Demo: ORD-88201 (Delivered)
                    </button>
                    <button class="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-mono text-cyan-300 font-bold transition flex items-center gap-1.5"
                            onclick="window.OrderTrackingView.performTrack('ORD-88202')">
                        <i data-lucide="play" class="w-3 h-3"></i> Try Demo: ORD-88202 (In Transit)
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }
};
