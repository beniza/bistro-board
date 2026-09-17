// Global application state
const state = {
    activeTab: 'overview',
    salesTrendGroupby: 'month',
    ordersPage: 1,
    ordersLimit: 50,
    startDate: '2026-08-01',
    endDate: '2026-09-05',
    salesTrendMetric: 'sales',
    ledgerPage: 1,
    ledgerLimit: 50,
    ledgerType: 'expense',
    charts: {} // Store chart instances to destroy/update them properly
};

// Formatting helpers
const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
};

const formatCompactValue = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    const absVal = Math.abs(num);
    if (absVal >= 10000000) { // 1 Crore
        return (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (absVal >= 100000) { // 1 Lakh
        return (num / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
    } else if (absVal >= 1000) { // 1 Thousand
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
    }
    return num.toFixed(0);
};

const formatCompactCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '₹0';
    return '₹' + formatCompactValue(num);
};

const formatDecimal = (val) => {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2
    }).format(val);
};

const getUrlWithDates = (baseUrl) => {
    const connector = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${connector}start_date=${state.startDate}&end_date=${state.endDate}`;
};

// Tab Switching System
const initTabs = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            if (tabId === state.activeTab) return;
            
            // Update active state in sidebar
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch visible panel
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            state.activeTab = tabId;
            
            // Update header title based on active tab
            updateHeaderTitle(tabId);
            
            // Trigger specific tab loading logic if needed
            onTabActivated(tabId);
        });
    });
};

const updateHeaderTitle = (tabId) => {
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    
    if (tabId === 'overview') {
        titleEl.textContent = 'Executive Overview';
        subtitleEl.textContent = 'Multi-channel sales performance and high-level KPIs';
    } else if (tabId === 'economics') {
        titleEl.textContent = 'Aggregator Economics';
        subtitleEl.textContent = 'Profitability analysis and margin leakage across Swiggy and Zomato';
    } else if (tabId === 'counter') {
        titleEl.textContent = 'Counter Insights';
        subtitleEl.textContent = 'In-store sales metrics, popular menu items, and payment methods';
    } else if (tabId === 'orders') {
        titleEl.textContent = 'Order Journal';
        subtitleEl.textContent = 'Complete transaction records across all channels';
    } else if (tabId === 'ledger') {
        titleEl.textContent = 'Business Ledger';
        subtitleEl.textContent = 'Operational expenses, daily income ledger, and business P&L surplus';
    } else if (tabId === 'reconciliation') {
        titleEl.textContent = 'Data Reconciliation';
        subtitleEl.textContent = 'Day-by-day comparison of actual App reports against manual Business Register';
    } else if (tabId === 'payouts') {
        titleEl.textContent = 'Payout Analytics';
        subtitleEl.textContent = 'Weekly platform payouts, full deduction waterfall, and order-level drill-down for Swiggy & Zomato';
    } else if (tabId === 'promo') {
        titleEl.textContent = 'Promo Impact Analysis';
        subtitleEl.textContent = 'Correlation between promo spending and order volume for Swiggy and Zomato';
    }
};

const onTabActivated = (tabId) => {
    if (tabId === 'overview') {
        loadOverviewData();
    } else if (tabId === 'economics') {
        loadEconomicsData();
    } else if (tabId === 'counter') {
        loadCounterInsights();
    } else if (tabId === 'orders') {
        loadOrdersTable();
    } else if (tabId === 'ledger') {
        loadLedgerData();
    } else if (tabId === 'reconciliation') {
        loadReconciliationData();
    } else if (tabId === 'payouts') {
        loadPayoutData();
    } else if (tabId === 'promo') {
        loadPromoData();
    }
};

// ----------------- DATA LOADING FUNCTIONS -----------------

// 1. OVERVIEW DATA
const loadOverviewData = async () => {
    try {
        // Fetch KPIs
        const kpiRes = await fetch(getUrlWithDates('/api/kpis'));
        const kpis = await kpiRes.json();
        
        // Update KPI Cards
        document.getElementById('kpi-total-sales').textContent = formatCurrency(kpis.overall.total_sales);
        document.getElementById('kpi-total-payout').textContent = formatCurrency(kpis.overall.total_payout);
        document.getElementById('kpi-total-orders').textContent = new Intl.NumberFormat('en-IN').format(kpis.overall.total_orders);
        document.getElementById('kpi-overall-aov').textContent = formatCurrency(kpis.overall.aov);
        
        // Margins and cancellation rates
        const marginRatio = kpis.overall.total_sales > 0 ? (kpis.overall.total_payout / kpis.overall.total_sales) * 100 : 0;
        const checkSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        document.getElementById('kpi-margin-percent').innerHTML = `${checkSvg} ${marginRatio.toFixed(1)}% Revenue Retained`;
        
        const successRate = kpis.overall.total_orders > 0 ? 
            ((kpis.overall.total_orders) / (kpis.overall.total_orders + kpis.overall.cancelled_orders)) * 100 : 100;
        const chartSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
        document.getElementById('kpi-delivered-ratio').innerHTML = `${chartSvg} ${successRate.toFixed(1)}% Success Rate`;
        
        // Update Channels mini cards
        const updateChannelCard = (channel, idPrefix) => {
            const data = kpis.channels[channel] || { sales: 0, orders: 0, aov: 0 };
            document.getElementById(`${idPrefix}-sales`).textContent = formatCurrency(data.sales);
            document.getElementById(`${idPrefix}-orders`).textContent = new Intl.NumberFormat('en-IN').format(data.orders);
            document.getElementById(`${idPrefix}-aov`).textContent = formatCurrency(data.aov);
        };
        
        updateChannelCard('Counter', 'counter');
        updateChannelCard('Swiggy', 'swiggy');
        updateChannelCard('Zomato', 'zomato');
        
        // Render mix donut chart
        renderChannelMixChart(kpis.channels);
        
        // Fetch sales trend
        loadSalesTrend();
        
        // Load the 5 new charts
        loadOverviewPandL();
        loadOverviewOpex();
        loadOverviewHourly();
        loadOverviewWeekday();
        loadOverviewShareMix();
        
    } catch (err) {
        console.error("Error loading overview KPIs:", err);
    }
};

const loadSalesTrend = async () => {
    try {
        const res = await fetch(getUrlWithDates(`/api/sales-trends?groupby=${state.salesTrendGroupby}`));
        const data = await res.json();
        renderSalesTrendChart(data);
    } catch (err) {
        console.error("Error loading sales trend:", err);
    }
};

const loadOverviewPandL = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/ledger-summary'));
        const data = await res.json();
        renderOverviewPandLChart(data.trends);
    } catch (err) {
        console.error("Error loading Overview P&L:", err);
    }
};

const loadOverviewOpex = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/expenses-breakup'));
        const data = await res.json();
        renderOverviewOpexChart(data);
    } catch (err) {
        console.error("Error loading Overview OpEx:", err);
    }
};

const loadOverviewHourly = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/hourly-sales'));
        const data = await res.json();
        renderOverviewHourlyChart(data);
    } catch (err) {
        console.error("Error loading Overview Hourly:", err);
    }
};

const loadOverviewWeekday = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/weekday-sales'));
        const data = await res.json();
        renderOverviewWeekdayChart(data);
    } catch (err) {
        console.error("Error loading Overview Weekday:", err);
    }
};

const loadOverviewShareMix = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/sales-trends?groupby=month'));
        const data = await res.json();
        renderOverviewShareMixChart(data);
    } catch (err) {
        console.error("Error loading Overview Share Mix:", err);
    }
};

const loadReconciliationData = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/daily-reconciliation'));
        const data = await res.json();
        
        // Compute variances sums
        let sumCounterVar = 0;
        let sumSwiggyVar = 0;
        let sumZomatoVar = 0;
        let sumPayoutVar = 0;
        
        data.forEach(item => {
            sumCounterVar += item.counter_variance;
            sumSwiggyVar += item.swiggy_variance;
            sumZomatoVar += item.zomato_variance;
            sumPayoutVar += item.payout_variance;
        });
        
        // Update variance KPI cards
        const updateReconKpi = (elId, val, descElId) => {
            const el = document.getElementById(elId);
            const descEl = document.getElementById(descElId);
            if (!el) return;
            
            const absVal = Math.abs(val);
            const formatted = formatCurrency(absVal);
            
            if (val > 10) { // App report is higher (green)
                el.innerHTML = `<span class="text-success">+ ${formatted}</span>`;
                el.style.color = "var(--success-color)";
                if (descEl) descEl.innerHTML = `<strong>App reports higher</strong> than register`;
            } else if (val < -10) { // Ledger is higher (red)
                el.innerHTML = `<span class="text-danger">- ${formatted}</span>`;
                el.style.color = "var(--danger-color)";
                if (descEl) descEl.innerHTML = `<strong>Register is higher</strong> than App reports`;
            } else { // Matching
                el.innerHTML = `<span>INR 0.00</span>`;
                el.style.color = "var(--text-secondary)";
                if (descEl) descEl.innerHTML = `Perfect Match (within ₹10)`;
            }
        };
        
        updateReconKpi('recon-kpi-counter', sumCounterVar, 'recon-kpi-counter-desc');
        updateReconKpi('recon-kpi-swiggy', sumSwiggyVar, 'recon-kpi-swiggy-desc');
        updateReconKpi('recon-kpi-zomato', sumZomatoVar, 'recon-kpi-zomato-desc');
        
        // Payout variance card (incorporates GST awareness)
        const payoutEl = document.getElementById('recon-kpi-payout');
        const payoutDescEl = document.getElementById('recon-kpi-payout-desc');
        if (payoutEl) {
            const absPayout = Math.abs(sumPayoutVar);
            const formattedPayout = formatCurrency(absPayout);
            if (sumPayoutVar > 10) {
                payoutEl.innerHTML = `<span class="text-success">+ ${formattedPayout}</span>`;
                payoutEl.style.color = "var(--success-color)";
                if (payoutDescEl) payoutDescEl.innerHTML = `<strong>App bank payouts are higher</strong> than register income`;
            } else if (sumPayoutVar < -10) {
                payoutEl.innerHTML = `<span class="text-danger">- ${formattedPayout}</span>`;
                payoutEl.style.color = "var(--danger-color)";
                if (payoutDescEl) payoutDescEl.innerHTML = `<strong>Register income is higher</strong> than App bank payouts`;
            } else {
                payoutEl.innerHTML = `<span>INR 0.00</span>`;
                payoutEl.style.color = "var(--text-secondary)";
                if (payoutDescEl) payoutDescEl.innerHTML = `True cash matches register (within ₹10)`;
            }
        }
        
        // Render daily reconciliation chart
        renderReconciliationChart(data);
        
        // Store data reference for CSV export
        window._reconData = data;
        
        // Populate Daily Table
        const tbody = document.getElementById('reconciliation-table-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            data.forEach(item => {
                const dateObj = new Date(item.date + 'T00:00:00');
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                
                const fmt = (v) => (v || 0).toFixed(2);
                
                // Diff cell renderer
                const diffCell = (val) => {
                    const v = val || 0;
                    const absV = Math.abs(v);
                    if (absV <= 10) {
                        return `<td style="text-align:right; color: var(--success-color); font-weight: 700;">0.00</td>`;
                    }
                    const color = v > 0 ? 'var(--success-color)' : 'var(--danger-color)';
                    const sign = v > 0 ? '+' : '-';
                    return `<td style="text-align:right; color: ${color}; font-weight: 700;">${sign}${absV.toFixed(2)}</td>`;
                };
                
                const numCell = (v, style='') => `<td style="text-align:right;${style}">${fmt(v)}</td>`;
                
                const isMatch = Math.abs(item.payout_variance) <= 10;
                const statusBadge = isMatch
                    ? `<span class="badge-table" style="background: rgba(46,213,115,0.15); color: var(--success-color); border:none;">Match</span>`
                    : `<span class="badge-table" style="background: rgba(255,71,87,0.15); color: var(--danger-color); border:none;">Variance</span>`;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${dateStr}</strong></td>
                    ${numCell(item.raw_counter, 'background: rgba(108,99,255,0.03);')}
                    ${numCell(item.led_counter, 'background: rgba(108,99,255,0.03);')}
                    ${diffCell(item.counter_variance)}
                    ${numCell(item.raw_swiggy, 'background: rgba(255,103,71,0.03);')}
                    ${numCell(item.led_swiggy, 'background: rgba(255,103,71,0.03);')}
                    ${diffCell(item.swiggy_variance)}
                    ${numCell(item.raw_zomato, 'background: rgba(230,69,83,0.03);')}
                    ${numCell(item.led_zomato, 'background: rgba(230,69,83,0.03);')}
                    ${diffCell(item.zomato_variance)}
                    ${numCell(item.raw_total_payout, 'background: rgba(46,213,115,0.03);')}
                    ${numCell(item.led_total_income, 'background: rgba(46,213,115,0.03);')}
                    ${diffCell(item.payout_variance)}
                    <td>${statusBadge}</td>
                `;
                tbody.appendChild(row);
            });
        }
        
    } catch (err) {
        console.error("Error loading reconciliation details:", err);
    }
};

// CSV Export for Reconciliation Table
const copyReconciliationCSV = () => {
    const data = window._reconData;
    if (!data || !data.length) {
        alert('No reconciliation data loaded yet.');
        return;
    }
    
    const headers = [
        'Date',
        'Counter App', 'Counter Ledger', 'Counter Diff',
        'Swiggy App', 'Swiggy Ledger', 'Swiggy Diff',
        'Zomato App', 'Zomato Ledger', 'Zomato Diff',
        'Total App Bank', 'Total Ledger Net', 'Total Diff',
        'Status'
    ];
    
    const rows = data.map(item => {
        const fmt = (v) => (v || 0).toFixed(2);
        const diffFmt = (v) => {
            const val = v || 0;
            return Math.abs(val) <= 10 ? '0.00' : val.toFixed(2);
        };
        const dateObj = new Date(item.date + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const status = Math.abs(item.payout_variance) <= 10 ? 'Match' : 'Variance';
        
        return [
            dateStr,
            fmt(item.raw_counter), fmt(item.led_counter), diffFmt(item.counter_variance),
            fmt(item.raw_swiggy), fmt(item.led_swiggy), diffFmt(item.swiggy_variance),
            fmt(item.raw_zomato), fmt(item.led_zomato), diffFmt(item.zomato_variance),
            fmt(item.raw_total_payout), fmt(item.led_total_income), diffFmt(item.payout_variance),
            status
        ].join('\t');
    });
    
    const csv = [headers.join('\t'), ...rows].join('\n');
    
    navigator.clipboard.writeText(csv).then(() => {
        const btn = document.getElementById('recon-copy-csv-btn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
            btn.style.background = 'var(--success-color, #2ed573)';
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2500);
        }
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = csv;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const btn = document.getElementById('recon-copy-csv-btn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = `✓ Copied!`;
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
        }
    });
};


// 2. ECONOMICS DATA
const loadEconomicsData = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/channel-economics'));
        const data = await res.json();
        
        // Populate Funnel Chart
        renderEconomicsFunnelChart(data);
        
        // Populate Table
        const tbody = document.getElementById('economics-table-body');
        tbody.innerHTML = '';
        
        const channels = ['Counter', 'Swiggy', 'Zomato'];
        channels.forEach(ch => {
            const item = data[ch] || { gross_sales: 0, total_discounts: 0, commissions: 0, other_fees: 0, net_payout: 0 };
            
            const totalDeductions = item.commissions + item.other_fees;
            const payoutRatio = item.gross_sales > 0 ? (item.net_payout / item.gross_sales) * 100 : 100.0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="tag-channel tag-${ch.toLowerCase()}">${ch}</span></td>
                <td><strong>${formatCurrency(item.gross_sales)}</strong></td>
                <td class="text-danger">${formatCurrency(item.commissions)}</td>
                <td class="text-danger">${formatCurrency(item.other_fees)}</td>
                <td class="text-danger"><strong>${formatCurrency(totalDeductions)}</strong></td>
                <td class="text-success"><strong>${formatCurrency(item.net_payout)}</strong></td>
                <td><span class="badge-table" style="background: rgba(46, 213, 115, 0.1); color: var(--success-color);">${payoutRatio.toFixed(1)}%</span></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (err) {
        console.error("Error loading economics data:", err);
    }
};

// 3. COUNTER INSIGHTS DATA
const loadCounterInsights = async () => {
    try {
        const res = await fetch(getUrlWithDates('/api/counter-insights'));
        const data = await res.json();
        
        // Render Top Menu Items Chart
        renderTopItemsChart(data.top_items);
        
        // Render Payments Chart
        renderCounterPaymentsChart(data.payments);
        
        // Populate Payment Table
        const tbody = document.getElementById('payment-table-body');
        tbody.innerHTML = '';
        
        data.payments.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${p.payment_type}</strong></td>
                <td>${formatCurrency(p.total_amount)}</td>
                <td>${p.order_count}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (err) {
        console.error("Error loading counter insights:", err);
    }
};

// 4. ORDER JOURNAL DATA TABLE
const loadOrdersTable = async () => {
    try {
        const channel = document.getElementById('filter-channel').value;
        const status = document.getElementById('filter-status').value;
        const search = document.getElementById('order-search').value;
        
        let baseUrl = `/api/orders?page=${state.ordersPage}&limit=${state.ordersLimit}`;
        if (channel) baseUrl += `&channel=${channel}`;
        if (status) baseUrl += `&status=${status}`;
        if (search) baseUrl += `&search=${encodeURIComponent(search)}`;
        
        const res = await fetch(getUrlWithDates(baseUrl));
        const result = await res.json();
        
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = '';
        
        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 3rem;">No transactions found matching your filters.</td></tr>`;
            document.getElementById('pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
            document.getElementById('btn-prev-page').disabled = true;
            document.getElementById('btn-next-page').disabled = true;
            return;
        }
        
        result.data.forEach(order => {
            const dateStr = new Date(order.order_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const statusClass = order.status.toLowerCase().includes('cancel') || order.status.toLowerCase().includes('reject') ? 'status-cancelled' : 'status-delivered';
            const cleanStatus = order.status.toLowerCase().includes('cancel') ? 'Cancelled' : (order.status.toLowerCase().includes('reject') ? 'Rejected' : 'Delivered');
            
            const itemsText = order.items_summary || '<span class="text-muted" style="font-style: italic;">Item detail unavailable</span>';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="tag-channel tag-${order.channel.toLowerCase()}">${order.channel}</span></td>
                <td><code>#${order.original_order_id}</code></td>
                <td>${dateStr}</td>
                <td><span class="tag-status ${statusClass}">${cleanStatus}</span></td>
                <td title="${order.items_summary || ''}">${itemsText}</td>
                <td>${formatCurrency(order.subtotal)}</td>
                <td class="text-danger">${formatCurrency(order.discount)}</td>
                <td>${formatCurrency(order.tax)}</td>
                <td><strong>${formatCurrency(order.grand_total)}</strong></td>
                <td class="text-success"><strong>${formatCurrency(order.net_payout)}</strong></td>
            `;
            tbody.appendChild(row);
        });
        
        // Update pagination info
        const start = (state.ordersPage - 1) * state.ordersLimit + 1;
        const end = Math.min(start + result.data.length - 1, result.total_records);
        document.getElementById('pagination-info').textContent = `Showing ${start} to ${end} of ${result.total_records} entries`;
        
        // Enable/disable page buttons
        document.getElementById('current-page-num').textContent = `Page ${state.ordersPage} of ${result.total_pages}`;
        document.getElementById('btn-prev-page').disabled = state.ordersPage === 1;
        document.getElementById('btn-next-page').disabled = state.ordersPage === result.total_pages;
        
    } catch (err) {
        console.error("Error loading orders table:", err);
    }
};

// 5. ITEM SALES BREAKDOWN (MODAL DETAILS)
const showItemBreakup = async (itemName) => {
    try {
        const url = `/api/item-breakup?item_name=${encodeURIComponent(itemName)}&start_date=${state.startDate}&end_date=${state.endDate}`;
        const res = await fetch(url);
        const data = await res.json();
        
        // Populate modal data
        document.getElementById('modal-item-name').textContent = data.item_name;
        document.getElementById('modal-total-qty').textContent = new Intl.NumberFormat('en-IN').format(data.total_qty);
        document.getElementById('modal-total-orders').textContent = new Intl.NumberFormat('en-IN').format(data.total_orders);
        
        // Open modal
        const modal = document.getElementById('item-modal');
        modal.classList.add('active');
        
        // Render Modal Area Trend Chart
        renderModalTrendChart(data.sales_trend);
        
        // Render Modal Type Mix Chart
        renderModalTypeMixChart(data.order_type_mix);
        
        // Populate Cross selling table
        const tbody = document.getElementById('modal-cross-body');
        tbody.innerHTML = '';
        
        if (data.frequently_bought_together.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">This item is always ordered individually.</td></tr>`;
        } else {
            data.frequently_bought_together.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.name}</strong></td>
                    <td>${item.qty} times</td>
                `;
                tbody.appendChild(row);
            });
        }
        
    } catch (err) {
        console.error("Error fetching item sales breakup:", err);
    }
};

const renderModalTrendChart = (trendData) => {
    const dates = trendData.map(d => {
        const [y, m, day] = d.date.split('-');
        return `${day}/${m}`;
    });
    const values = trendData.map(d => d.qty);
    const colors = getChartColors();
    
    const options = {
        series: [{
            name: 'Quantity Ordered',
            data: values
        }],
        chart: {
            type: 'area',
            height: 200,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.counter],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.05,
            }
        },
        xaxis: {
            categories: dates,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                hideOverlappingLabels: true,
                style: { fontSize: '10px' }
            }
        },
        yaxis: {
            labels: {
                style: { fontSize: '10px' }
            },
            tickAmount: 3
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} units`
            }
        }
    };
    
    safeInitChart('modal-chart-trend', options);
};

const renderModalTypeMixChart = (typeMix) => {
    const labels = typeMix.map(t => t.name);
    const series = typeMix.map(t => t.qty);
    const colors = getChartColors();
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 200,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: labels,
        colors: [colors.counter, colors.accent, '#ffa502'],
        stroke: {
            show: true,
            width: 1,
            colors: [colors.mode === 'dark' ? '#141226' : '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '11px' },
                        value: { show: true, fontSize: '14px', fontWeight: 700 }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        }
    };
    
    safeInitChart('modal-chart-type', options);
};

// ----------------- CHART RENDER FUNCTIONS -----------------

// Helper to destroy existing chart if it exists
const safeInitChart = (id, options) => {
    if (state.charts[id]) {
        state.charts[id].destroy();
    }
    const chart = new ApexCharts(document.getElementById(id), options);
    chart.render();
    state.charts[id] = chart;
    return chart;
};

// 1. Channel Mix Donut Chart
const renderChannelMixChart = (channelsData) => {
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    const series = channels.map(ch => channelsData[ch] ? channelsData[ch].sales : 0);
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 310,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: channels,
        colors: [colors.counter, colors.swiggy, colors.zomato],
        stroke: {
            show: true,
            width: 2,
            colors: [bgCard || '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '14px',
                            fontWeight: 600,
                        },
                        value: {
                            show: true,
                            fontSize: '20px',
                            fontWeight: 700,
                            formatter: (val) => formatCurrency(val)
                        },
                        total: {
                            show: true,
                            label: 'Total Revenue',
                            fontSize: '12px',
                            color: colors.text,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCurrency(total);
                            }
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '13px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-channel-share', options);
};

// 2. Sales Trend Area Chart
const renderSalesTrendChart = (trendsData) => {
    const dates = Object.keys(trendsData).sort();
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    const colors = getChartColors();
    const metric = state.salesTrendMetric;

    const trendTitle = document.getElementById('sales-trend-title');
    if (trendTitle) {
        trendTitle.textContent = metric === 'payout' ? 'Payout Trends' : 'Revenue Trends';
    }

    const series = channels.map(ch => {
        return {
            name: ch,
            data: dates.map(d => trendsData[d][ch] ? trendsData[d][ch][metric] : 0.0)
        };
    });
    
    const formattedLabels = dates.map(d => {
        if (state.salesTrendGroupby === 'month') {
            const [year, month] = d.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[parseInt(month) - 1]} ${year}`;
        }
        // For daily
        const [y, m, day] = d.split('-');
        return `${day}/${m}`;
    });
    
    const options = {
        series: series,
        chart: {
            type: 'area',
            height: 310,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        colors: [colors.counter, colors.swiggy, colors.zomato],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => formatCompactCurrency(val)
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: formattedLabels,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => formatCompactCurrency(val)
            }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '13px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCompactCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-sales-trend', options);
};

// 3. Platform Economics grouped bar chart
const renderEconomicsFunnelChart = (economicsData) => {
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    const colors = getChartColors();
    
    const grossSales = channels.map(ch => economicsData[ch] ? economicsData[ch].gross_sales : 0.0);
    const deductions = channels.map(ch => {
        const item = economicsData[ch];
        return item ? item.commissions + item.other_fees : 0.0;
    });
    const payouts = channels.map(ch => economicsData[ch] ? economicsData[ch].net_payout : 0.0);
    
    const options = {
        series: [
            { name: 'Gross Bill Value', data: grossSales },
            { name: 'Platform Deductions', data: deductions },
            { name: 'Credited Payout', data: payouts }
        ],
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.accent, '#ff4757', '#2ed573'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: channels,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            title: { text: 'Amount (INR)', style: { color: colors.text, fontFamily: 'Outfit' } },
            labels: {
                formatter: (val) => formatCompactCurrency(val)
            }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontSize: '13px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCompactCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-eco-comparison', options);
};

// --- New Overview Chart 1: P&L Trend Chart ---
const renderOverviewPandLChart = (trendsData) => {
    const colors = getChartColors();
    const months = trendsData.map(t => {
        const [year, month] = t.month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    
    const revenues = trendsData.map(t => t.income);
    const expenses = trendsData.map(t => t.expenses);
    const margins = trendsData.map(t => t.income > 0 ? ((t.income - t.expenses) / t.income * 100) : 0.0);
    
    const options = {
        series: [
            { name: 'Revenue', type: 'column', data: revenues },
            { name: 'Expenses', type: 'column', data: expenses },
            { name: 'Profit Margin', type: 'line', data: margins }
        ],
        chart: {
            height: 320,
            type: 'line',
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.accent, '#f59e0b', '#10b981'],
        stroke: {
            width: [0, 0, 3],
            curve: 'smooth'
        },
        plotOptions: {
            bar: {
                columnWidth: '50%',
                borderRadius: 4
            }
        },
        xaxis: {
            categories: months,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: [
            {
                seriesName: 'Revenue',
                title: { text: 'Revenue / Expenses', style: { color: colors.text, fontFamily: 'Outfit' } },
                labels: { formatter: (val) => formatCompactCurrency(val) }
            },
            {
                seriesName: 'Revenue',
                show: false
            },
            {
                seriesName: 'Profit Margin',
                opposite: true,
                title: { text: 'Margin (%)', style: { color: colors.text, fontFamily: 'Outfit' } },
                labels: { formatter: (val) => `${val.toFixed(0)}%` }
            }
        ],
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            shared: true,
            intersect: false,
            y: [
                { formatter: (val) => formatCurrency(val) },
                { formatter: (val) => formatCurrency(val) },
                { formatter: (val) => `${val.toFixed(1)}%` }
            ]
        }
    };
    
    safeInitChart('chart-overview-pandl', options);
};

// --- New Overview Chart 2: OpEx Breakdown ---
const renderOverviewOpexChart = (opexData) => {
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    let categories = [];
    let amounts = [];
    
    const threshold = 7;
    if (opexData.length <= threshold) {
        categories = opexData.map(d => d.category);
        amounts = opexData.map(d => d.amount);
    } else {
        const top = opexData.slice(0, threshold);
        const rest = opexData.slice(threshold);
        categories = top.map(d => d.category);
        amounts = top.map(d => d.amount);
        
        categories.push('Others');
        const restSum = rest.reduce((sum, d) => sum + d.amount, 0);
        amounts.push(restSum);
    }
    
    const options = {
        series: amounts,
        chart: {
            type: 'donut',
            height: 310,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: categories,
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'],
        stroke: {
            show: true,
            width: 2,
            colors: [bgCard || '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '13px', fontWeight: 600 },
                        value: { 
                            show: true, 
                            fontSize: '16px', 
                            fontWeight: 700,
                            formatter: (val) => formatCompactCurrency(val) 
                        },
                        total: {
                            show: true,
                            label: 'Total Expenses',
                            fontSize: '11px',
                            color: colors.text,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCompactCurrency(total);
                            }
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            y: { formatter: (val) => formatCurrency(val) }
        }
    };
    
    safeInitChart('chart-overview-opex', options);
};

// --- New Overview Chart 3: Hourly Sales Profile ---
const renderOverviewHourlyChart = (hourlyData) => {
    const colors = getChartColors();
    
    const hours = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '00'];
    const hourLabels = ['11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM', '12 AM'];
    
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    const series = channels.map(ch => {
        return {
            name: ch,
            data: hours.map(h => hourlyData[h] ? hourlyData[h][ch] : 0.0)
        };
    });
    
    const options = {
        series: series,
        chart: {
            type: 'area',
            height: 320,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.counter, colors.swiggy, colors.zomato],
        dataLabels: {
            enabled: true,
            formatter: (val) => formatCompactValue(val)
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: hourLabels,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { formatter: (val) => formatCompactValue(val) }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            y: { formatter: (val) => formatCompactValue(val) }
        }
    };
    
    safeInitChart('chart-overview-hourly', options);
};

// --- New Overview Chart 4: Weekday Sales ---
const renderOverviewWeekdayChart = (weekdayData) => {
    const colors = getChartColors();
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    
    const series = channels.map(ch => {
        return {
            name: ch,
            data: weekdays.map(day => weekdayData[day] ? weekdayData[day][ch] : 0.0)
        };
    });
    
    const options = {
        series: series,
        chart: {
            type: 'bar',
            height: 320,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.counter, colors.swiggy, colors.zomato],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4
            }
        },
        dataLabels: { enabled: false },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: weekdays,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { formatter: (val) => formatCompactCurrency(val) }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            y: { formatter: (val) => formatCurrency(val) }
        }
    };
    
    safeInitChart('chart-overview-weekday', options);
};

// --- New Overview Chart 5: 100% Stacked Monthly Channel Contribution ---
const renderOverviewShareMixChart = (trendsData) => {
    const colors = getChartColors();
    const dates = Object.keys(trendsData).sort();
    const channels = ['Counter', 'Swiggy', 'Zomato'];
    
    const series = channels.map(ch => {
        return {
            name: ch,
            data: dates.map(d => trendsData[d][ch] ? trendsData[d][ch].sales : 0.0)
        };
    });
    
    const formattedLabels = dates.map(d => {
        const [year, month] = d.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    
    const options = {
        series: series,
        chart: {
            type: 'bar',
            height: 320,
            stacked: true,
            stackType: '100%',
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.counter, colors.swiggy, colors.zomato],
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '60%',
                borderRadius: 4
            }
        },
        xaxis: {
            categories: formattedLabels,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            y: { formatter: (val) => `${formatCurrency(val)}` }
        }
    };
    
    safeInitChart('chart-overview-share-mix', options);
};

// --- New Reconciliation Chart: App Receipts vs Ledger Total ---
const renderReconciliationChart = (reconciliationData) => {
    const colors = getChartColors();
    const dates = reconciliationData.map(d => {
        const dateObj = new Date(d.date);
        return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    
    const rawTotalPayout = reconciliationData.map(d => d.raw_total_payout);
    const ledTotalIncome = reconciliationData.map(d => d.led_total_income);
    
    const options = {
        series: [
            { name: 'App Bank Credit (True Payout)', data: rawTotalPayout },
            { name: 'Ledger Recorded Income', data: ledTotalIncome }
        ],
        chart: {
            height: 300,
            type: 'line',
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        colors: [colors.accent, '#f59e0b'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: dates,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { formatter: (val) => formatCompactCurrency(val) }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: { mode: colors.mode },
        tooltip: {
            y: { formatter: (val) => formatCurrency(val) }
        }
    };
    
    safeInitChart('chart-reconciliation-comparison', options);
};

// 4. Popular Menu Items Horizontal Bar Chart
const renderTopItemsChart = (topItems) => {
    const names = topItems.map(item => item.name);
    const qtys = topItems.map(item => item.qty);
    const colors = getChartColors();
    
    const options = {
        series: [{
            name: 'Quantity Ordered',
            data: qtys
        }],
        chart: {
            type: 'bar',
            height: 380,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false },
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    const idx = config.dataPointIndex;
                    if (idx !== undefined && idx >= 0) {
                        const itemName = config.w.config.xaxis.categories[idx];
                        showItemBreakup(itemName);
                    }
                }
            }
        },
        plotOptions: {
            bar: {
                barHeight: '75%',
                distributed: true,
                horizontal: true,
                borderRadius: 4
            }
        },
        colors: [
            colors.counter, '#00e1f7', '#00cff0', '#00bde9', 
            '#00abe1', '#0099da', '#0087d3', '#0075cb',
            '#0063c4', '#0051bc', '#003eb4', '#002cac'
        ],
        dataLabels: {
            enabled: true,
            textAnchor: 'start',
            style: {
                colors: ['#fff'],
                fontFamily: 'Outfit',
                fontWeight: 600
            },
            formatter: function (val, opt) {
                return opt.w.globals.labels[opt.dataPointIndex] + ":  " + val;
            },
            offsetX: 10,
        },
        stroke: {
            width: 0
        },
        xaxis: {
            categories: names,
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { show: false }
        },
        grid: {
            show: false
        },
        legend: {
            show: false
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} servings (Click to inspect)`
            }
        }
    };
    
    safeInitChart('chart-counter-items', options);
};

// 5. Counter Payment Mix Donut Chart
const renderCounterPaymentsChart = (payments) => {
    const labels = payments.map(p => p.payment_type);
    const series = payments.map(p => p.total_amount);
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 250,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: labels,
        colors: [colors.counter, colors.accent, '#ffa502', '#2ed573', '#ff4757'],
        stroke: {
            show: true,
            width: 2,
            colors: [bgCard || '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '13px' },
                        value: { 
                            show: true, 
                            fontSize: '18px', 
                            fontWeight: 700,
                            formatter: (val) => formatCurrency(val)
                        },
                        total: {
                            show: true,
                            label: 'Total Counter',
                            fontSize: '11px',
                            color: colors.text,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCurrency(total);
                            }
                        }
                    }
                }
            }
        },
        legend: {
            show: false
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-counter-payments', options);
};

// Custom Premium Toast Notification System
const showNotification = (title, message, type = 'success') => {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 380px;
            width: calc(100% - 40px);
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    const bg = type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    const iconSvg = type === 'success' 
        ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.style.cssText = `
        background: ${bg};
        color: #fff;
        backdrop-filter: blur(10px);
        padding: 1rem 1.25rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Outfit', sans-serif;
    `;
    
    toast.innerHTML = `
        <div style="flex-shrink: 0; margin-top: 2px;">${iconSvg}</div>
        <div style="flex-grow: 1;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.2rem;">${title}</div>
            <div style="font-size: 0.8rem; opacity: 0.9; line-height: 1.4; white-space: pre-line;">${message}</div>
        </div>
        <button style="background: none; border: none; color: #fff; opacity: 0.7; cursor: pointer; padding: 0; flex-shrink: 0; font-size: 1.1rem; line-height: 1;" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 6000);
};

// ----------------- EVENT LISTENERS AND BOOTSTRAP -----------------

const initEvents = () => {
    // Sales trends Daily vs Monthly toggle
    const toggleMonth = document.getElementById('toggle-month');
    const toggleDay = document.getElementById('toggle-day');
    
    toggleMonth.addEventListener('click', () => {
        toggleMonth.classList.add('active');
        toggleDay.classList.remove('active');
        state.salesTrendGroupby = 'month';
        loadSalesTrend();
    });
    
    toggleDay.addEventListener('click', () => {
        toggleDay.classList.add('active');
        toggleMonth.classList.remove('active');
        state.salesTrendGroupby = 'day';
        loadSalesTrend();
    });

    // Sales trends Revenue vs Payout toggle
    const toggleRevenue = document.getElementById('toggle-metric-revenue');
    const togglePayout = document.getElementById('toggle-metric-payout');

    toggleRevenue.addEventListener('click', () => {
        toggleRevenue.classList.add('active');
        togglePayout.classList.remove('active');
        state.salesTrendMetric = 'sales';
        loadSalesTrend();
    });

    togglePayout.addEventListener('click', () => {
        togglePayout.classList.add('active');
        toggleRevenue.classList.remove('active');
        state.salesTrendMetric = 'payout';
        loadSalesTrend();
    });
    
    // Order filters in Order Journal
    document.getElementById('btn-apply-filters').addEventListener('click', () => {
        state.ordersPage = 1;
        loadOrdersTable();
    });
    
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-channel').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('order-search').value = '';
        state.ordersPage = 1;
        loadOrdersTable();
    });
    
    // Pressing Enter in search triggers apply
    document.getElementById('order-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.ordersPage = 1;
            loadOrdersTable();
        }
    });
    
    // Pagination buttons
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (state.ordersPage > 1) {
            state.ordersPage--;
            loadOrdersTable();
        }
    });
    
    document.getElementById('btn-next-page').addEventListener('click', () => {
        state.ordersPage++;
        loadOrdersTable();
    });

    // Date picker custom changes
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    const handleDateChange = () => {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value;
        if (startVal && endVal) {
            state.startDate = startVal;
            state.endDate = endVal;
            // Reload currently active tab
            onTabActivated(state.activeTab);
        }
    };
    
    startDateInput.addEventListener('change', handleDateChange);
    endDateInput.addEventListener('change', handleDateChange);

    // Sync Progress Modal Elements
    const syncModal = document.getElementById('sync-modal');
    const btnCloseSyncModal = document.getElementById('btn-close-sync-modal');
    const btnDoneSync = document.getElementById('btn-done-sync');
    const syncStatusStage = document.getElementById('sync-status-stage');
    const syncStatusPercent = document.getElementById('sync-status-percent');
    const syncProgressBar = document.getElementById('sync-progress-bar');
    const syncStatusMsg = document.getElementById('sync-status-msg');
    const syncLog = document.getElementById('sync-log');
    const syncSummary = document.getElementById('sync-summary');
    const syncError = document.getElementById('sync-error');

    function closeSyncModal() {
        if (syncModal) syncModal.classList.remove('active');
        // Restore sync button
        const btnSync = document.getElementById('btn-sync-data');
        if (btnSync) {
            const icon = btnSync.querySelector('.sync-icon');
            const label = btnSync.querySelector('span');
            if (icon) icon.classList.remove('spin-anim');
            btnSync.disabled = false;
            if (label) label.textContent = 'Sync Data';
        }
    }

    if (btnCloseSyncModal) btnCloseSyncModal.addEventListener('click', closeSyncModal);
    if (btnDoneSync) btnDoneSync.addEventListener('click', closeSyncModal);

    // Sync Data Button click listener
    const btnSync = document.getElementById('btn-sync-data');
    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            const icon = btnSync.querySelector('.sync-icon');
            const label = btnSync.querySelector('span');
            
            // Start spinning animation and disable button
            if (icon) icon.classList.add('spin-anim');
            btnSync.disabled = true;
            if (label) label.textContent = 'Syncing...';
            
            // Reset modal state
            syncStatusStage.textContent = 'Launching Sync...';
            syncStatusPercent.textContent = '0%';
            syncProgressBar.style.width = '0%';
            syncStatusMsg.textContent = 'Initializing data sync process...';
            syncLog.textContent = 'Contacting server...';
            syncSummary.style.display = 'none';
            syncSummary.textContent = '';
            syncError.style.display = 'none';
            syncError.textContent = '';
            btnDoneSync.style.display = 'none';
            btnCloseSyncModal.style.display = 'none';
            
            // Open modal
            if (syncModal) syncModal.classList.add('active');
            
            try {
                const res = await fetch('/api/run-import', { method: 'POST' });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                const initData = await res.json();
                syncLog.textContent += '\n' + initData.message;
                
                // Start polling status
                let pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch('/api/sync-status');
                        if (!statusRes.ok) return;
                        const status = await statusRes.json();
                        
                        // Update progress bar & labels
                        syncStatusStage.textContent = status.stage.toUpperCase();
                        syncStatusPercent.textContent = `${status.progress_percent}%`;
                        syncProgressBar.style.width = `${status.progress_percent}%`;
                        syncStatusMsg.textContent = status.message;
                        
                        // Update log console
                        if (status.log && status.log.length > 0) {
                            syncLog.textContent = status.log.join('\n');
                            // Auto-scroll to bottom of log
                            syncLog.scrollTop = syncLog.scrollHeight;
                        }
                        
                        // Check if sync completed or failed
                        if (!status.running) {
                            clearInterval(pollInterval);
                            
                            // Enable closing actions
                            btnDoneSync.style.display = 'block';
                            btnCloseSyncModal.style.display = 'block';
                            
                            if (status.stage === 'completed' && status.result) {
                                const data = status.result;
                                // Build pretty summary details
                                let summaryText = `<strong>Sync Summary:</strong><br/>`;
                                summaryText += `• Sales Orders: <strong>${data.sales.orders_inserted} Total</strong> `;
                                summaryText += `(${data.sales.counter_orders} Counter, ${data.sales.swiggy_orders} Swiggy, ${data.sales.zomato_orders} Zomato)<br/>`;
                                summaryText += `• New: <strong>${data.sales.orders_new}</strong> · Duplicates auto-merged: <strong>${data.sales.orders_duplicate}</strong>`;
                                if (data.sales.files_skipped > 0) {
                                    summaryText += ` · Files already imported (skipped): <strong>${data.sales.files_skipped}</strong>`;
                                }
                                summaryText += `<br/>`;
                                summaryText += `• Register Expenses: <strong>${data.register.expenses} records</strong><br/>`;
                                summaryText += `• Register Income: <strong>${data.register.income} records</strong><br/>`;
                                
                                if (data.email_fetch) {
                                    if (data.email_fetch.status === 'success') {
                                        summaryText += `• Gmail Fetch: <strong>Scan complete</strong> (Downloaded <strong>${data.email_fetch.downloaded}</strong> new reports)`;
                                        if (data.email_fetch.downloaded > 0) {
                                            summaryText += ` [Counter: ${data.email_fetch.stats.counter}, Swiggy: ${data.email_fetch.stats.swiggy}, Zomato: ${data.email_fetch.stats.zomato}]`;
                                        }
                                    } else if (data.email_fetch.status === 'skipped') {
                                        summaryText += `• Gmail Fetch: <strong>Skipped</strong> (GMAIL_APP_PASSWORD not set)`;
                                    } else {
                                        summaryText += `• Gmail Fetch: <span style="color:var(--danger-color)"><strong>Failed</strong> (${data.email_fetch.message})</span>`;
                                    }
                                }
                                
                                syncSummary.innerHTML = summaryText;
                                syncSummary.style.display = 'block';
                                
                                showNotification(
                                    'Data Sync Complete',
                                    `Successfully synced all files from Gmail and directories!`,
                                    'success'
                                );

                                // Populate and reveal the Import History table
                                function escapeHtml(value) {
                                    return String(value).replace(/[&<>"']/g, (char) => ({
                                        '&': '&amp;',
                                        '<': '&lt;',
                                        '>': '&gt;',
                                        '"': '&quot;',
                                        "'": '&#39;'
                                    }[char]));
                                }
                                try {
                                    const historyRes = await fetch('/api/import-log');
                                    if (historyRes.ok) {
                                        const historyData = await historyRes.json();
                                        const historyBody = document.getElementById('import-history-body');
                                        const historyDetails = document.getElementById('import-history-details');
                                        if (historyBody && historyData.entries && historyData.entries.length > 0) {
                                            historyBody.innerHTML = historyData.entries.map(entry => `
                                                <tr>
                                                    <td>${escapeHtml(entry.file_path)}</td>
                                                    <td>${escapeHtml(entry.channel)}</td>
                                                    <td>${escapeHtml(entry.imported_at)}</td>
                                                    <td>${escapeHtml(entry.orders_new)}</td>
                                                    <td>${escapeHtml(entry.orders_duplicate)}</td>
                                                    <td>${escapeHtml(entry.status)}</td>
                                                </tr>
                                            `).join('');
                                            if (historyDetails) historyDetails.style.display = 'block';
                                        }
                                    }
                                } catch (historyErr) {
                                    console.error('Failed to load import history:', historyErr);
                                }

                                // Refresh current active tab
                                onTabActivated(state.activeTab);
                            } else {
                                // Failed
                                syncError.innerHTML = `<strong>Sync Failed:</strong><br/>${status.message}<br/><br/>Check the Activity Log above for details.`;
                                syncError.style.display = 'block';
                                showNotification(
                                    'Data Sync Failed',
                                    status.message || 'Import process crashed.',
                                    'error'
                                );
                            }
                        }
                    } catch (pollErr) {
                        console.error('Error polling sync status:', pollErr);
                    }
                }, 1000);
                
            } catch (err) {
                console.error('Failed to launch Data Sync:', err);
                syncLog.textContent += `\nERROR: Failed to launch data sync: ${err.message}`;
                syncError.innerHTML = `<strong>Failed to start sync:</strong><br/>${err.message}`;
                syncError.style.display = 'block';
                btnDoneSync.style.display = 'block';
                btnCloseSyncModal.style.display = 'block';
                showNotification(
                    'Data Sync Failed',
                    err.message || 'Could not connect to sync endpoint.',
                    'error'
                );
            }
        });
    }

    // Close item modal triggers
    const modal = document.getElementById('item-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Ledger filtering and search
    document.getElementById('btn-ledger-apply-filters')?.addEventListener('click', () => {
        state.ledgerPage = 1;
        loadLedgerTransactionsTable();
    });
    
    document.getElementById('btn-ledger-reset-filters')?.addEventListener('click', () => {
        document.getElementById('ledger-search').value = '';
        state.ledgerPage = 1;
        loadLedgerTransactionsTable();
    });
    
    document.getElementById('ledger-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.ledgerPage = 1;
            loadLedgerTransactionsTable();
        }
    });
    
    document.getElementById('filter-ledger-type')?.addEventListener('change', () => {
        state.ledgerPage = 1;
        loadLedgerTransactionsTable();
    });
    
    // Ledger pagination
    document.getElementById('btn-ledger-prev-page')?.addEventListener('click', () => {
        if (state.ledgerPage > 1) {
            state.ledgerPage--;
            loadLedgerTransactionsTable();
        }
    });
    
    document.getElementById('btn-ledger-next-page')?.addEventListener('click', () => {
        state.ledgerPage++;
        loadLedgerTransactionsTable();
    });
};

// 6. BUSINESS LEDGER (INCOME & EXPENSES)
const loadLedgerData = async () => {
    try {
        const kpiRes = await fetch(getUrlWithDates('/api/ledger-summary'));
        const ledger = await kpiRes.json();
        
        document.getElementById('kpi-ledger-total-income').textContent = formatCurrency(ledger.summary.total_income);
        document.getElementById('kpi-ledger-total-expenses').textContent = formatCurrency(ledger.summary.total_expenses);
        document.getElementById('kpi-ledger-net-profit').textContent = formatCurrency(ledger.summary.net_profit);
        document.getElementById('kpi-ledger-margin-ratio').textContent = `${ledger.summary.profit_margin.toFixed(1)}%`;
        
        const profitTrendEl = document.getElementById('kpi-ledger-profit-trend');
        if (ledger.summary.net_profit >= 0) {
            profitTrendEl.textContent = "Surplus Profit";
            profitTrendEl.className = "kpi-trend positive";
        } else {
            profitTrendEl.textContent = "Deficit Loss";
            profitTrendEl.className = "kpi-trend negative";
        }
        
        renderLedgerTrendChart(ledger.trends);
        
        const expRes = await fetch(getUrlWithDates('/api/expenses-breakup'));
        const expensesCategories = await expRes.json();
        renderLedgerExpensesChart(expensesCategories);
        populateTopExpenseCategoriesTable(expensesCategories);
        
        const incRes = await fetch(getUrlWithDates('/api/income-breakup'));
        const incomeBreakup = await incRes.json();
        renderLedgerIncomeChart(incomeBreakup);
        
        loadLedgerTransactionsTable();
        
    } catch (err) {
        console.error("Error loading business ledger data:", err);
    }
};

const renderLedgerTrendChart = (trends) => {
    const months = trends.map(t => {
        const [year, month] = t.month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    
    const incomes = trends.map(t => t.income);
    const expenses = trends.map(t => t.expenses);
    const profits = trends.map(t => t.profit);
    
    const colors = getChartColors();
    
    const options = {
        series: [
            { name: 'Total Receipts', type: 'column', data: incomes },
            { name: 'Total Expenses', type: 'column', data: expenses },
            { name: 'Net Surplus', type: 'line', data: profits }
        ],
        chart: {
            height: 310,
            type: 'line',
            stacked: false,
            background: 'transparent',
            foreColor: colors.text,
            toolbar: { show: false }
        },
        stroke: {
            width: [0, 0, 3],
            curve: 'smooth'
        },
        colors: ['#2ed573', '#ff4757', '#a35cff'],
        plotOptions: {
            bar: {
                columnWidth: '50%',
                borderRadius: 4
            }
        },
        fill: {
            opacity: [0.85, 0.85, 1],
            gradient: {
                inverseColors: false,
                shade: 'light',
                type: "vertical",
                opacityFrom: 0.85,
                opacityTo: 0.55,
                stops: [0, 100, 100, 100]
            }
        },
        labels: months,
        markers: {
            size: 4
        },
        xaxis: {
            type: 'category',
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => formatCompactCurrency(val)
            }
        },
        grid: {
            borderColor: colors.border,
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            fontSize: '13px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-ledger-pandl', options);
};

const renderLedgerExpensesChart = (categories) => {
    const top8 = categories.slice(0, 8);
    const remaining = categories.slice(8);
    if (remaining.length > 0) {
        const otherSum = remaining.reduce((a, b) => a + b.amount, 0);
        top8.push({ category: 'Others', amount: otherSum });
    }
    
    const labels = top8.map(c => c.category);
    const series = top8.map(c => c.amount);
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 310,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: labels,
        colors: ['#7000ff', '#ffa502', '#2ed573', '#ff4757', '#00f2fe', '#a35cff', '#1e90ff', '#ff6b81', '#747d8c'],
        stroke: {
            show: true,
            width: 2,
            colors: [bgCard || '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '13px' },
                        value: { 
                            show: true, 
                            fontSize: '18px', 
                            fontWeight: 700,
                            formatter: (val) => formatCurrency(val)
                        },
                        total: {
                            show: true,
                            label: 'Total Expenses',
                            fontSize: '11px',
                            color: colors.text,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCurrency(total);
                            }
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-ledger-expenses-breakup', options);
};

const renderLedgerIncomeChart = (income) => {
    const labels = ['Counter Net', 'GST Collected', 'Swiggy Gross', 'Zomato Gross', 'Paper Bills'];
    const series = [income.counter_net, income.counter_gst, income.swiggy, income.zomato, income.paper];
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 250,
            background: 'transparent',
            foreColor: colors.text
        },
        labels: labels,
        colors: [colors.counter, '#a35cff', '#ff9900', '#ff007f', '#747d8c'],
        stroke: {
            show: true,
            width: 2,
            colors: [bgCard || '#fff']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '12px' },
                        value: { 
                            show: true, 
                            fontSize: '16px', 
                            fontWeight: 700,
                            formatter: (val) => formatCurrency(val)
                        },
                        total: {
                            show: true,
                            label: 'Total Receipts',
                            fontSize: '10px',
                            color: colors.text,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return formatCurrency(total);
                            }
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px',
            fontFamily: 'Outfit',
            markers: { radius: 12 }
        },
        theme: {
            mode: colors.mode
        },
        tooltip: {
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };
    
    safeInitChart('chart-ledger-income-breakup', options);
};

const populateTopExpenseCategoriesTable = (categories) => {
    const tbody = document.getElementById('ledger-expenses-categories-tbody');
    tbody.innerHTML = '';
    
    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">No expense categories found.</td></tr>`;
        return;
    }
    
    categories.slice(0, 15).forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${c.category}</strong></td>
            <td>${formatCurrency(c.amount)}</td>
            <td>${c.count} transactions</td>
        `;
        tbody.appendChild(row);
    });
};

const loadLedgerTransactionsTable = async () => {
    try {
        const search = document.getElementById('ledger-search').value;
        const type = document.getElementById('filter-ledger-type').value;
        
        let baseUrl = `/api/ledger-transactions?type=${type}&page=${state.ledgerPage}&limit=${state.ledgerLimit}`;
        if (search) baseUrl += `&search=${encodeURIComponent(search)}`;
        
        const res = await fetch(getUrlWithDates(baseUrl));
        const result = await res.json();
        
        const thead = document.getElementById('ledger-journal-thead');
        const tbody = document.getElementById('ledger-journal-tbody');
        
        tbody.innerHTML = '';
        
        if (type === 'expense') {
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Mode</th>
                    <th>Remarks</th>
                </tr>
            `;
            
            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">No expense transactions found.</td></tr>`;
                document.getElementById('ledger-pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
                document.getElementById('btn-ledger-prev-page').disabled = true;
                document.getElementById('btn-ledger-next-page').disabled = true;
                return;
            }
            
            result.data.forEach(item => {
                const dateStr = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const isPaid = String(item.paid).toLowerCase().includes('yes') || String(item.paid).toLowerCase().includes('paid');
                const statusClass = isPaid ? 'status-delivered' : 'status-cancelled';
                const statusText = isPaid ? 'Paid' : 'Unpaid';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateStr}</td>
                    <td><span class="tag-channel tag-counter" style="text-transform: uppercase;">${item.category}</span></td>
                    <td>${item.description || '-'}</td>
                    <td><strong>${formatCurrency(item.amount)}</strong></td>
                    <td><span class="tag-status ${statusClass}">${statusText}</span></td>
                    <td><code>${item.mode || '-'}</code></td>
                    <td>${item.remarks || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Petpooja Actual (Counter)</th>
                    <th>GST Collected (5%)</th>
                    <th>Petpooja Net</th>
                    <th>Swiggy Gross</th>
                    <th>Zomato Gross</th>
                    <th>Grand Total Receipts</th>
                </tr>
            `;
            
            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">No income transactions found.</td></tr>`;
                document.getElementById('ledger-pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
                document.getElementById('btn-ledger-prev-page').disabled = true;
                document.getElementById('btn-ledger-next-page').disabled = true;
                return;
            }
            
            result.data.forEach(item => {
                const dateStr = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateStr}</td>
                    <td>${formatCurrency(item.petpooja_actual)}</td>
                    <td>${formatCurrency(item.gst_5pct)}</td>
                    <td class="text-success">${formatCurrency(item.petpooja_net)}</td>
                    <td>${formatCurrency(item.swiggy_gross)}</td>
                    <td>${formatCurrency(item.zomato_gross)}</td>
                    <td><strong>${formatCurrency(item.total_income)}</strong></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        const start = (state.ledgerPage - 1) * state.ledgerLimit + 1;
        const end = Math.min(start + result.data.length - 1, result.total_records);
        document.getElementById('ledger-pagination-info').textContent = `Showing ${start} to ${end} of ${result.total_records} entries`;
        
        document.getElementById('ledger-current-page-num').textContent = `Page ${state.ledgerPage} of ${result.total_pages}`;
        document.getElementById('btn-ledger-prev-page').disabled = state.ledgerPage === 1;
        document.getElementById('btn-ledger-next-page').disabled = state.ledgerPage === result.total_pages;
        
    } catch (err) {
        console.error("Error loading ledger transaction journal:", err);
    }
};

// Theme System Support
const getChartColors = () => {
    const style = getComputedStyle(document.body);
    const mode = (style.getPropertyValue('--chart-mode') || 'light').trim();
    return {
        text: (style.getPropertyValue('--text-secondary') || '#475569').trim(),
        border: (style.getPropertyValue('--border-card') || '#e2e8f0').trim(),
        counter: (style.getPropertyValue('--counter-color') || '#0284c7').trim(),
        swiggy: (style.getPropertyValue('--swiggy-color') || '#ea580c').trim(),
        zomato: (style.getPropertyValue('--zomato-color') || '#db2777').trim(),
        accent: (style.getPropertyValue('--accent-blue') || '#4f46e5').trim(),
        mode: mode
    };
};

const updateChartsTheme = () => {
    const colors = getChartColors();
    const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim();
    
    // Update active charts configuration
    if (state.charts['chart-channel-share']) {
        state.charts['chart-channel-share'].updateOptions({
            theme: { mode: colors.mode },
            colors: [colors.counter, colors.swiggy, colors.zomato],
            chart: { foreColor: colors.text },
            stroke: { colors: [bgCard || '#fff'] }
        });
    }
    if (state.charts['chart-sales-trend']) {
        state.charts['chart-sales-trend'].updateOptions({
            theme: { mode: colors.mode },
            colors: [colors.counter, colors.swiggy, colors.zomato],
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-eco-comparison']) {
        state.charts['chart-eco-comparison'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-counter-items']) {
        state.charts['chart-counter-items'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text }
        });
    }
    if (state.charts['chart-counter-payments']) {
        state.charts['chart-counter-payments'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            stroke: { colors: [bgCard || '#fff'] }
        });
    }
    if (state.charts['chart-overview-pandl']) {
        state.charts['chart-overview-pandl'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-overview-opex']) {
        state.charts['chart-overview-opex'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            stroke: { colors: [bgCard || '#fff'] }
        });
    }
    if (state.charts['chart-overview-hourly']) {
        state.charts['chart-overview-hourly'].updateOptions({
            theme: { mode: colors.mode },
            colors: [colors.counter, colors.swiggy, colors.zomato],
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-overview-weekday']) {
        state.charts['chart-overview-weekday'].updateOptions({
            theme: { mode: colors.mode },
            colors: [colors.counter, colors.swiggy, colors.zomato],
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-overview-share-mix']) {
        state.charts['chart-overview-share-mix'].updateOptions({
            theme: { mode: colors.mode },
            colors: [colors.counter, colors.swiggy, colors.zomato],
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-reconciliation-comparison']) {
        state.charts['chart-reconciliation-comparison'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-ledger-pandl']) {
        state.charts['chart-ledger-pandl'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            grid: { borderColor: colors.border }
        });
    }
    if (state.charts['chart-ledger-expenses-breakup']) {
        state.charts['chart-ledger-expenses-breakup'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            stroke: { colors: [bgCard || '#fff'] }
        });
    }
    if (state.charts['chart-ledger-income-breakup']) {
        state.charts['chart-ledger-income-breakup'].updateOptions({
            theme: { mode: colors.mode },
            chart: { foreColor: colors.text },
            stroke: { colors: [bgCard || '#fff'] }
        });
    }
};

const setTheme = (themeName) => {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-color');
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem('theme', themeName);
    
    // Set sidebar buttons state
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update layout/charts
    setTimeout(() => {
        updateChartsTheme();
    }, 100);
};

const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Bind Sidebar theme buttons
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
        });
    });
    
    // Bind Mobile cycle button
    const mobileThemeBtn = document.getElementById('mobile-theme-btn');
    if (mobileThemeBtn) {
        mobileThemeBtn.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || 'light';
            let nextTheme = 'light';
            if (currentTheme === 'light') nextTheme = 'dark';
            else if (currentTheme === 'dark') nextTheme = 'color';
            setTheme(nextTheme);
        });
    }
};

const initMobileSidebar = () => {
    const hamburgerBtn = document.getElementById('hamburger-menu-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('app-sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.add('active');
        });
    }
    
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    });
    
    // Clicking outside sidebar closes it
    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && (!hamburgerBtn || !hamburgerBtn.contains(e.target))) {
                sidebar.classList.remove('active');
            }
        }
    });
};

// ============================================================
// PAYOUT ANALYTICS
// ============================================================

let _payoutData = [];
let _payoutDrillState = { channel: null, week_key: null, page: 1, totalPages: 1, label: '' };

const loadPayoutData = async () => {
    try {
        const channelFilter = document.getElementById('payout-channel-filter')?.value || '';
        let url = '/api/weekly-payouts';
        const params = [];
        if (channelFilter) params.push(`channel=${encodeURIComponent(channelFilter)}`);
        // Date range from global filters
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        _payoutData = await res.json();

        // Aggregate by channel for KPIs
        const byChannel = {};
        _payoutData.forEach(w => {
            if (!byChannel[w.channel]) byChannel[w.channel] = { orders: 0, gross: 0, commission: 0, other: 0, net: 0, discount: 0 };
            const c = byChannel[w.channel];
            c.orders += w.orders;
            c.gross += w.gross_sales;
            c.commission += w.commission;
            c.other += w.other_charges;
            c.net += w.net_payout;
            c.discount += w.discount;
        });

        const S = byChannel['Swiggy'] || {};
        const Z = byChannel['Zomato'] || {};
        const sRetention = S.gross > 0 ? ((S.net / S.gross) * 100).toFixed(1) : 0;
        const zRetention = Z.gross > 0 ? ((Z.net / Z.gross) * 100).toFixed(1) : 0;
        const totalGross = (S.gross || 0) + (Z.gross || 0);
        const totalNet = (S.net || 0) + (Z.net || 0);
        const totalComm = (S.commission || 0) + (Z.commission || 0);
        const totalOther = (S.other || 0) + (Z.other || 0);
        const blendedRetention = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : 0;

        setText('payout-swiggy-gross', formatCurrency(S.gross || 0));
        setText('payout-swiggy-orders', `${S.orders || 0} orders`);
        setText('payout-swiggy-net', formatCurrency(S.net || 0));
        setText('payout-swiggy-rate', `${sRetention}% of gross retained`);
        setText('payout-zomato-gross', formatCurrency(Z.gross || 0));
        setText('payout-zomato-orders', `${Z.orders || 0} orders`);
        setText('payout-zomato-net', formatCurrency(Z.net || 0));
        setText('payout-zomato-rate', `${zRetention}% of gross retained`);
        setText('payout-total-commission', formatCurrency(totalComm));
        setText('payout-total-other', `+ ${formatCurrency(totalOther)} other fees`);
        setText('payout-combined-net', formatCurrency(totalNet));
        setText('payout-combined-rate', `${blendedRetention}% blended retention`);

        renderPayoutWeeklyChart();
        renderPayoutBreakdownCharts(byChannel);
        renderPayoutWeeklyTable();
    } catch (err) {
        console.error('Error loading payout data:', err);
    }
};

const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const renderPayoutWeeklyChart = () => {
    // Group by week_key, sum Swiggy & Zomato net separately
    const weekMap = {};
    _payoutData.forEach(w => {
        if (!weekMap[w.week_key]) weekMap[w.week_key] = { week_start: w.week_start, week_end: w.week_end, Swiggy: 0, Zomato: 0, SwiggyGross: 0, ZomatoGross: 0 };
        weekMap[w.week_key][w.channel] = (weekMap[w.week_key][w.channel] || 0) + w.net_payout;
        weekMap[w.week_key][w.channel + 'Gross'] = (weekMap[w.week_key][w.channel + 'Gross'] || 0) + w.gross_sales;
    });

    const weeks = Object.keys(weekMap).sort();
    const labels = weeks.map(wk => {
        const ws = weekMap[wk].week_start;
        const we = weekMap[wk].week_end;
        const d1 = new Date(ws + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const d2 = new Date(we + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        return `${d1}–${d2}`;
    });
    const swiggyNet = weeks.map(wk => +(weekMap[wk].Swiggy || 0).toFixed(2));
    const zomatoNet = weeks.map(wk => +(weekMap[wk].Zomato || 0).toFixed(2));

    const options = {
        series: [
            { name: 'Swiggy Net Payout', data: swiggyNet },
            { name: 'Zomato Net Payout', data: zomatoNet }
        ],
        chart: {
            type: 'bar', height: 320, stacked: false,
            background: 'transparent',
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            events: {
                dataPointSelection: (event, chartCtx, config) => {
                    const wk = weeks[config.dataPointIndex];
                    const ch = config.seriesIndex === 0 ? 'Swiggy' : 'Zomato';
                    if (wk) openPayoutDrilldown(ch, wk, weekMap[wk].week_start, weekMap[wk].week_end);
                }
            }
        },
        plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
        colors: ['#FF6747', '#E64553'],
        xaxis: { categories: labels, labels: { style: { colors: 'var(--text-muted)', fontSize: '11px' }, rotate: -30 }, axisBorder: { show: false } },
        yaxis: { labels: { formatter: v => '₹' + (v/1000).toFixed(0) + 'K', style: { colors: 'var(--text-muted)' } } },
        tooltip: { y: { formatter: v => formatCurrency(v) } },
        legend: { labels: { colors: 'var(--text-primary)' } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' },
        theme: { mode: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark' }
    };
    safeInitChart('chart-payout-weekly', options);
};

const renderPayoutBreakdownCharts = (byChannel) => {
    ['Swiggy', 'Zomato'].forEach(ch => {
        const c = byChannel[ch] || {};
        const retained = Math.max(0, (c.net || 0));
        const commission = c.commission || 0;
        const other = c.other || 0;
        const options = {
            series: [retained, commission, other],
            labels: ['Net Payout (You Keep)', 'Commission', 'Other Fees'],
            colors: ['#2ed573', '#ff4757', '#ffa502'],
            chart: { type: 'donut', height: 260, background: 'transparent', fontFamily: 'Outfit, sans-serif' },
            plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Net Payout', formatter: () => formatCurrency(retained) } } } } },
            legend: { position: 'bottom', labels: { colors: 'var(--text-primary)' } },
            tooltip: { y: { formatter: v => formatCurrency(v) } },
            theme: { mode: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark' }
        };
        safeInitChart(`chart-${ch.toLowerCase()}-breakdown`, options);
    });
};

const renderPayoutWeeklyTable = () => {
    const tbody = document.getElementById('payout-weekly-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    _payoutData.forEach(w => {
        const ws = new Date(w.week_start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const we = new Date(w.week_end + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const retColor = w.deduction_rate > 25 ? 'var(--danger-color)' : w.deduction_rate > 20 ? '#ffa502' : 'var(--success-color)';
        const chClass = w.channel === 'Swiggy' ? 'tag-swiggy' : 'tag-zomato';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="white-space:nowrap;">${ws} – ${we}</td>
            <td><span class="tag-channel ${chClass}">${w.channel}</span></td>
            <td style="text-align:right;">${w.orders}</td>
            <td style="text-align:right; font-weight:600;">${w.gross_sales.toFixed(2)}</td>
            <td style="text-align:right; color: var(--text-muted);">${w.discount.toFixed(2)}</td>
            <td style="text-align:right; color: var(--text-muted);">${w.tax_collected.toFixed(2)}</td>
            <td style="text-align:right; color: var(--danger-color);">${w.commission.toFixed(2)}</td>
            <td style="text-align:right; color: var(--danger-color);">${w.other_charges.toFixed(2)}</td>
            <td style="text-align:right; color: var(--danger-color); font-weight:600;">${w.total_deductions.toFixed(2)}</td>
            <td style="text-align:right; color: var(--success-color); font-weight:700;">${w.net_payout.toFixed(2)}</td>
            <td style="text-align:right; color: ${retColor}; font-weight:600;">${(100 - w.deduction_rate).toFixed(1)}%</td>
            <td style="text-align:center;">
                <button onclick="openPayoutDrilldown('${w.channel}', '${w.week_key}', '${w.week_start}', '${w.week_end}')" style="padding: 0.25rem 0.65rem; background: rgba(108,99,255,0.15); color: var(--accent-color); border: 1px solid rgba(108,99,255,0.3); border-radius: 6px; cursor:pointer; font-family: Outfit, sans-serif; font-size: 0.75rem; font-weight:600; white-space:nowrap;">View Orders</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

const openPayoutDrilldown = async (channel, week_key, week_start, week_end, page = 1) => {
    _payoutDrillState = { channel, week_key, page, totalPages: 1, label: `${channel} · Week of ${week_start}` };
    document.getElementById('payout-modal').style.display = 'block';
    document.getElementById('payout-modal-title').textContent = `${channel} — Order Drill-Down`;
    const ws = new Date(week_start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const we = new Date(week_end + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('payout-modal-subtitle').textContent = `${ws} to ${we}`;
    document.getElementById('payout-modal-tbody').innerHTML = '<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-muted);">Loading...</td></tr>';

    try {
        const res = await fetch(`/api/payout-orders?channel=${encodeURIComponent(channel)}&week_key=${encodeURIComponent(week_key)}&page=${page}&limit=50`);
        const result = await res.json();

        _payoutDrillState.totalPages = result.total_pages;
        _payoutDrillState.page = result.page;

        // Aggregate KPIs
        let totGross = 0, totComm = 0, totOther = 0, totNet = 0;
        result.data.forEach(o => { totGross += o.gross_sales; totComm += o.commission; totOther += o.other_charges; totNet += o.net_payout; });

        setText('pm-orders', result.total_records);
        setText('pm-gross', formatCurrency(totGross));
        setText('pm-commission', formatCurrency(totComm));
        setText('pm-other', formatCurrency(totOther));
        setText('pm-net', formatCurrency(totNet));

        // Pagination info
        setText('pm-record-count', `Showing ${result.data.length} of ${result.total_records} orders`);
        setText('pm-page-info', `Page ${result.page} / ${result.total_pages}`);
        document.getElementById('pm-prev-btn').disabled = result.page <= 1;
        document.getElementById('pm-next-btn').disabled = result.page >= result.total_pages;

        // Render rows
        const tbody = document.getElementById('payout-modal-tbody');
        tbody.innerHTML = '';
        result.data.forEach(o => {
            const dt = new Date(o.order_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const shortId = o.original_order_id || o.order_id.replace(/^(Swiggy|Zomato)_/, '');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size:0.75rem; font-family: monospace; white-space:nowrap;">${shortId}</td>
                <td style="white-space:nowrap;">${dt}</td>
                <td>${o.order_type || '—'}</td>
                <td style="text-align:right;">${o.subtotal.toFixed(2)}</td>
                <td style="text-align:right; color: var(--text-muted);">${o.discount.toFixed(2)}</td>
                <td style="text-align:right; color: var(--text-muted);">${o.tax.toFixed(2)}</td>
                <td style="text-align:right; font-weight:600;">${o.gross_sales.toFixed(2)}</td>
                <td style="text-align:right; color: var(--danger-color);">${o.commission.toFixed(2)}</td>
                <td style="text-align:right; color: var(--danger-color);">${o.other_charges.toFixed(2)}</td>
                <td style="text-align:right; color: var(--success-color); font-weight:700;">${o.net_payout.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Payout drilldown error:', err);
        document.getElementById('payout-modal-tbody').innerHTML = '<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--danger-color);">Error loading data.</td></tr>';
    }
};

const payoutModalPage = (dir) => {
    const s = _payoutDrillState;
    const newPage = dir === 'next' ? s.page + 1 : s.page - 1;
    if (newPage < 1 || newPage > s.totalPages) return;
    openPayoutDrilldown(s.channel, s.week_key, s.week_start || '', s.week_end || '', newPage);
    // Update state with dates from data
    const match = _payoutData.find(w => w.channel === s.channel && w.week_key === s.week_key);
    if (match) openPayoutDrilldown(s.channel, s.week_key, match.week_start, match.week_end, newPage);
};

const copyPayoutCSV = () => {
    if (!_payoutData.length) { alert('No payout data loaded.'); return; }
    const headers = ['Week Start', 'Week End', 'Channel', 'Orders', 'Gross Sales', 'Discount', 'GST Collected', 'Commission', 'Other Fees', 'Total Deductions', 'Net Payout', 'Retention %'];
    const rows = _payoutData.map(w => [
        w.week_start, w.week_end, w.channel, w.orders,
        w.gross_sales.toFixed(2), w.discount.toFixed(2), w.tax_collected.toFixed(2),
        w.commission.toFixed(2), w.other_charges.toFixed(2), w.total_deductions.toFixed(2),
        w.net_payout.toFixed(2), (100 - w.deduction_rate).toFixed(1) + '%'
    ].join('\t'));
    const csv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
        const btn = document.getElementById('payout-copy-btn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            btn.style.background = 'var(--success-color)';
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2500);
        }
    });
};

// Close payout modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('payout-modal');
    if (modal && e.target === modal) modal.style.display = 'none';
});

// ============================================================
// PROMO IMPACT ANALYTICS
// ============================================================

let _promoData = [];

const getCorrLabel = (r) => {
    if (r === null || r === undefined || isNaN(r)) return 'No data';
    const absR = Math.abs(r);
    let desc = '';
    if (absR >= 0.7) desc = 'Strong';
    else if (absR >= 0.4) desc = 'Moderate';
    else if (absR >= 0.1) desc = 'Weak';
    else desc = 'Negligible';
    
    const dir = r >= 0 ? 'positive' : 'negative';
    return `${desc} ${dir} correlation`;
};

const loadPromoData = async () => {
    try {
        const channelFilter = document.getElementById('promo-channel-filter')?.value || '';
        let url = '/api/promo-analysis';
        const params = [];
        if (channelFilter) params.push(`channel=${encodeURIComponent(channelFilter)}`);
        // Date range from global filters
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        const result = await res.json();

        _promoData = result.weekly;

        // Calculate KPI values per channel (or global totals if filter allows)
        const computePromoKPIs = (ch) => {
            const rows = result.weekly.filter(w => w.channel === ch);
            let totalDisc = 0;
            let totalOrders = 0;
            let promoOrders = 0;
            rows.forEach(row => {
                totalDisc += row.total_discount;
                totalOrders += row.total_orders;
                promoOrders += row.promo_orders;
            });
            const avgDisc = totalOrders > 0 ? (totalDisc / totalOrders) : 0;
            const pct = totalOrders > 0 ? (promoOrders / totalOrders * 100) : 0;
            return { totalDisc, avgDisc, pct };
        };

        const swiggyKPIs = computePromoKPIs('Swiggy');
        const zomatoKPIs = computePromoKPIs('Zomato');

        // Set Pearson correlation labels and details
        const rSwiggy = result.correlations.Swiggy;
        document.getElementById('promo-corr-swiggy').textContent = (rSwiggy !== undefined && rSwiggy !== null) ? rSwiggy.toFixed(2) : '—';
        document.getElementById('promo-corr-swiggy-label').textContent = getCorrLabel(rSwiggy);
        document.getElementById('promo-swiggy-total-disc').textContent = formatCurrency(swiggyKPIs.totalDisc);
        document.getElementById('promo-swiggy-avg-disc').textContent = formatCurrency(swiggyKPIs.avgDisc);
        document.getElementById('promo-swiggy-pct').textContent = swiggyKPIs.pct.toFixed(1) + '%';

        const rZomato = result.correlations.Zomato;
        document.getElementById('promo-corr-zomato').textContent = (rZomato !== undefined && rZomato !== null) ? rZomato.toFixed(2) : '—';
        document.getElementById('promo-corr-zomato-label').textContent = getCorrLabel(rZomato);
        document.getElementById('promo-zomato-total-disc').textContent = formatCurrency(zomatoKPIs.totalDisc);
        document.getElementById('promo-zomato-avg-disc').textContent = formatCurrency(zomatoKPIs.avgDisc);
        document.getElementById('promo-zomato-pct').textContent = zomatoKPIs.pct.toFixed(1) + '%';

        // Aggregate weekly data by week_key for "Both Channels" trend
        const weeksMap = {};
        result.weekly.forEach(w => {
            if (!weeksMap[w.week_key]) {
                weeksMap[w.week_key] = {
                    week_key: w.week_key,
                    week_start: w.week_start,
                    week_end: w.week_end,
                    total_orders: 0,
                    promo_orders: 0,
                    non_promo_orders: 0,
                    total_discount: 0,
                    gross_sales: 0,
                    net_payout: 0,
                    promo_order_vals: 0,
                    non_promo_order_vals: 0
                };
            }
            const item = weeksMap[w.week_key];
            item.total_orders += w.total_orders;
            item.promo_orders += w.promo_orders;
            item.non_promo_orders += w.non_promo_orders;
            item.total_discount += w.total_discount;
            item.gross_sales += w.gross_sales;
            item.net_payout += w.net_payout;
            item.promo_order_vals += (w.avg_val_promo_orders || 0) * (w.promo_orders || 0);
            item.non_promo_order_vals += (w.avg_val_no_promo || 0) * (w.non_promo_orders || 0);
        });

        const sortedWeeks = Object.values(weeksMap).sort((a, b) => a.week_key.localeCompare(b.week_key));
        const trendData = channelFilter ? result.weekly : sortedWeeks;

        // 1. Dual-Axis Promo Spend vs Orders Trend Chart
        const weekLabels = trendData.map(d => {
            const ws = new Date(d.week_start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const we = new Date(d.week_end + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            return `${ws} – ${we}`;
        });

        const discountSpend = trendData.map(d => d.total_discount);
        const orderVolume = trendData.map(d => d.total_orders);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f1f2f6' : '#2f3542';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

        const trendOptions = {
            series: [
                {
                    name: 'Discount Spend',
                    type: 'column',
                    data: discountSpend
                },
                {
                    name: 'Order Count',
                    type: 'line',
                    data: orderVolume
                }
            ],
            chart: {
                height: 320,
                type: 'line',
                toolbar: { show: false },
                background: 'transparent'
            },
            stroke: {
                width: [0, 3],
                curve: 'smooth'
            },
            colors: ['#6c63ff', '#ffa502'],
            dataLabels: { enabled: false },
            labels: weekLabels,
            xaxis: {
                type: 'category',
                labels: { style: { colors: textColor, fontFamily: 'Outfit, sans-serif' } }
            },
            yaxis: [
                {
                    title: {
                        text: 'Promo Spend (₹)',
                        style: { color: textColor, fontFamily: 'Outfit, sans-serif' }
                    },
                    labels: {
                        style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                        formatter: val => formatCurrency(val)
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Order Volume',
                        style: { color: textColor, fontFamily: 'Outfit, sans-serif' }
                    },
                    labels: {
                        style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                        formatter: val => val.toFixed(0)
                    }
                }
            ],
            grid: { borderColor: gridColor },
            legend: {
                labels: { colors: textColor },
                fontFamily: 'Outfit, sans-serif'
            },
            theme: { mode: isDark ? 'dark' : 'light' }
        };

        safeInitChart('chart-promo-trend', trendOptions);

        // 2. Scatter Plot: Daily Discount vs Orders
        const scatterSeries = [];
        if (!channelFilter || channelFilter === 'Swiggy') {
            const swiggyDaily = result.daily.filter(d => d.channel === 'Swiggy');
            scatterSeries.push({
                name: 'Swiggy',
                data: swiggyDaily.map(d => [d.total_discount, d.orders])
            });
        }
        if (!channelFilter || channelFilter === 'Zomato') {
            const zomatoDaily = result.daily.filter(d => d.channel === 'Zomato');
            scatterSeries.push({
                name: 'Zomato',
                data: zomatoDaily.map(d => [d.total_discount, d.orders])
            });
        }

        const scatterOptions = {
            series: scatterSeries,
            chart: {
                height: 320,
                type: 'scatter',
                zoom: { enabled: true, type: 'xy' },
                toolbar: { show: false },
                background: 'transparent'
            },
            colors: ['#FF6747', '#E64553'],
            xaxis: {
                title: {
                    text: 'Daily Discount Spend (₹)',
                    style: { color: textColor, fontFamily: 'Outfit, sans-serif' }
                },
                labels: {
                    style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                    formatter: val => formatCurrency(val)
                }
            },
            yaxis: {
                title: {
                    text: 'Daily Order Count',
                    style: { color: textColor, fontFamily: 'Outfit, sans-serif' }
                },
                labels: {
                    style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                    formatter: val => val.toFixed(0)
                }
            },
            grid: { borderColor: gridColor },
            legend: {
                labels: { colors: textColor },
                fontFamily: 'Outfit, sans-serif'
            },
            theme: { mode: isDark ? 'dark' : 'light' }
        };

        safeInitChart('chart-promo-scatter', scatterOptions);

        // 3. Avg Order Value Comparison: Promo vs Non-Promo
        let swiggyPromoSum = 0, swiggyPromoCount = 0;
        let swiggyNoPromoSum = 0, swiggyNoPromoCount = 0;
        let zomatoPromoSum = 0, zomatoPromoCount = 0;
        let zomatoNoPromoSum = 0, zomatoNoPromoCount = 0;

        result.weekly.forEach(w => {
            if (w.channel === 'Swiggy') {
                swiggyPromoSum += (w.avg_val_promo_orders || 0) * (w.promo_orders || 0);
                swiggyPromoCount += (w.promo_orders || 0);
                swiggyNoPromoSum += (w.avg_val_no_promo || 0) * (w.non_promo_orders || 0);
                swiggyNoPromoCount += (w.non_promo_orders || 0);
            } else if (w.channel === 'Zomato') {
                zomatoPromoSum += (w.avg_val_promo_orders || 0) * (w.promo_orders || 0);
                zomatoPromoCount += (w.promo_orders || 0);
                zomatoNoPromoSum += (w.avg_val_no_promo || 0) * (w.non_promo_orders || 0);
                zomatoNoPromoCount += (w.non_promo_orders || 0);
            }
        });

        const swiggyPromoAOV = swiggyPromoCount > 0 ? (swiggyPromoSum / swiggyPromoCount) : 0;
        const swiggyNoPromoAOV = swiggyNoPromoCount > 0 ? (swiggyNoPromoSum / swiggyNoPromoCount) : 0;
        const zomatoPromoAOV = zomatoPromoCount > 0 ? (zomatoPromoSum / zomatoPromoCount) : 0;
        const zomatoNoPromoAOV = zomatoNoPromoCount > 0 ? (zomatoNoPromoSum / zomatoNoPromoCount) : 0;

        let orderValSeries = [];
        let orderValCategories = [];

        if (channelFilter === 'Swiggy') {
            orderValCategories = ['Swiggy'];
            orderValSeries = [
                { name: 'Promo Orders AOV', data: [Number(swiggyPromoAOV.toFixed(2))] },
                { name: 'Non-Promo Orders AOV', data: [Number(swiggyNoPromoAOV.toFixed(2))] }
            ];
        } else if (channelFilter === 'Zomato') {
            orderValCategories = ['Zomato'];
            orderValSeries = [
                { name: 'Promo Orders AOV', data: [Number(zomatoPromoAOV.toFixed(2))] },
                { name: 'Non-Promo Orders AOV', data: [Number(zomatoNoPromoAOV.toFixed(2))] }
            ];
        } else {
            orderValCategories = ['Swiggy', 'Zomato'];
            orderValSeries = [
                { name: 'Promo Orders AOV', data: [Number(swiggyPromoAOV.toFixed(2)), Number(zomatoPromoAOV.toFixed(2))] },
                { name: 'Non-Promo Orders AOV', data: [Number(swiggyNoPromoAOV.toFixed(2)), Number(zomatoNoPromoAOV.toFixed(2))] }
            ];
        }

        const orderValOptions = {
            series: orderValSeries,
            chart: {
                height: 280,
                type: 'bar',
                toolbar: { show: false },
                background: 'transparent'
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '45%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: { enabled: false },
            colors: ['#FF4757', '#2ED573'],
            xaxis: {
                categories: orderValCategories,
                labels: { style: { colors: textColor, fontFamily: 'Outfit, sans-serif' } }
            },
            yaxis: {
                title: { text: 'Avg Order Value (₹)', style: { color: textColor, fontFamily: 'Outfit, sans-serif' } },
                labels: {
                    style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                    formatter: val => formatCurrency(val)
                }
            },
            grid: { borderColor: gridColor },
            legend: {
                labels: { colors: textColor },
                fontFamily: 'Outfit, sans-serif'
            },
            theme: { mode: isDark ? 'dark' : 'light' }
        };

        safeInitChart('chart-promo-orderval', orderValOptions);

        // 4. Discount size distribution bucket chart
        const bucketCategories = ['No Discount', '₹1 – ₹50', '₹51 – ₹100', '₹101 – ₹200', '₹200+'];
        let bucketSeries = [];

        if (channelFilter === 'Swiggy') {
            const swiggyBucketOrders = bucketCategories.map(cat => {
                const b = result.buckets.find(x => x.channel === 'Swiggy' && x.bucket === cat);
                return b ? b.orders : 0;
            });
            bucketSeries = [{ name: 'Swiggy Orders', data: swiggyBucketOrders }];
        } else if (channelFilter === 'Zomato') {
            const zomatoBucketOrders = bucketCategories.map(cat => {
                const b = result.buckets.find(x => x.channel === 'Zomato' && x.bucket === cat);
                return b ? b.orders : 0;
            });
            bucketSeries = [{ name: 'Zomato Orders', data: zomatoBucketOrders }];
        } else {
            const swiggyBucketOrders = bucketCategories.map(cat => {
                const b = result.buckets.find(x => x.channel === 'Swiggy' && x.bucket === cat);
                return b ? b.orders : 0;
            });
            const zomatoBucketOrders = bucketCategories.map(cat => {
                const b = result.buckets.find(x => x.channel === 'Zomato' && x.bucket === cat);
                return b ? b.orders : 0;
            });
            bucketSeries = [
                { name: 'Swiggy', data: swiggyBucketOrders },
                { name: 'Zomato', data: zomatoBucketOrders }
            ];
        }

        const bucketOptions = {
            series: bucketSeries,
            chart: {
                height: 280,
                type: 'bar',
                stacked: true,
                toolbar: { show: false },
                background: 'transparent'
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '60%'
                }
            },
            colors: ['#FF6747', '#E64553'],
            dataLabels: { enabled: false },
            xaxis: {
                categories: bucketCategories,
                labels: {
                    style: { colors: textColor, fontFamily: 'Outfit, sans-serif' },
                    formatter: val => val.toFixed(0)
                }
            },
            yaxis: {
                labels: { style: { colors: textColor, fontFamily: 'Outfit, sans-serif' } }
            },
            grid: { borderColor: gridColor },
            legend: {
                labels: { colors: textColor },
                fontFamily: 'Outfit, sans-serif'
            },
            theme: { mode: isDark ? 'dark' : 'light' }
        };

        safeInitChart('chart-promo-buckets', bucketOptions);

        // Render Weekly Table
        renderPromoWeeklyTable();

    } catch (err) {
        console.error('Error loading promo analysis data:', err);
    }
};

const renderPromoWeeklyTable = () => {
    const tbody = document.getElementById('promo-weekly-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    _promoData.forEach(w => {
        const ws = new Date(w.week_start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const we = new Date(w.week_end + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const chClass = w.channel === 'Swiggy' ? 'tag-swiggy' : 'tag-zomato';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="white-space:nowrap;">${ws} – ${we}</td>
            <td><span class="tag-channel ${chClass}">${w.channel}</span></td>
            <td style="text-align:right;">${w.total_orders}</td>
            <td style="text-align:right;">${w.promo_orders}</td>
            <td style="text-align:right; font-weight:600;">${w.promo_pct.toFixed(1)}%</td>
            <td style="text-align:right; color: var(--danger-color);">${w.total_discount.toFixed(2)}</td>
            <td style="text-align:right; color: var(--text-muted);">${w.discount_per_order.toFixed(2)}</td>
            <td style="text-align:right; color: var(--text-muted);">${w.avg_discount_when_promo.toFixed(2)}</td>
            <td style="text-align:right; font-weight:600;">${w.avg_val_promo_orders.toFixed(2)}</td>
            <td style="text-align:right; color: var(--text-secondary);">${w.avg_val_no_promo.toFixed(2)}</td>
            <td style="text-align:right; color: var(--success-color); font-weight:700;">${w.gross_sales.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
};

const copyPromoCSV = () => {
    if (!_promoData || !_promoData.length) { alert('No promo data loaded.'); return; }
    const headers = ['Week Start', 'Week End', 'Channel', 'Total Orders', 'Promo Orders', '% With Promo', 'Total Discount', 'Avg Disc/Order', 'Avg Disc (Promo Only)', 'Avg AOV (Promo)', 'Avg AOV (No Promo)', 'Gross Sales'];
    const rows = _promoData.map(w => [
        w.week_start, w.week_end, w.channel, w.total_orders, w.promo_orders,
        w.promo_pct + '%', w.total_discount.toFixed(2), w.discount_per_order.toFixed(2),
        w.avg_discount_when_promo.toFixed(2), w.avg_val_promo_orders.toFixed(2),
        w.avg_val_no_promo.toFixed(2), w.gross_sales.toFixed(2)
    ].join('\t'));
    const csv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
        const btn = document.getElementById('promo-copy-btn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            btn.style.background = 'var(--success-color)';
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2500);
        }
    });
};

// ============================================================

// Start application
const init = () => {
    initTheme();          // Load and apply initial theme
    initMobileSidebar();  // Bind mobile hamburger menu drawer
    initTabs();
    initEvents();
    
    // Initial data load
    loadOverviewData();
};

document.addEventListener('DOMContentLoaded', init);
