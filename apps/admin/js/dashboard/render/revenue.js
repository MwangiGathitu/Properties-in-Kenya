// js/dashboard/render/revenue.js
import { Store } from '../store.js';
import { UI } from '../ui.js';

export function initRevenueRenderer() {
  Store.subscribe('revenue', (data) => {
    const container = UI.els.revenueContainer || document.getElementById('revenueDashboard');
    if (!container) return;

    // 10. Graceful fallbacks
    if (!data) {
      return UI.showErrorState('revenueContainer', 'Revenue data is temporarily unavailable.', "loadModule('revenue')");
    }

    const fmt = (val) => `KES ${Number(val || 0).toLocaleString()}`;

    container.innerHTML = `
      <div class="revenue-grid">
        <div class="rev-card">
          <span class="rev-label">Today</span>
          <span class="rev-value">${fmt(data.today)}</span>
        </div>
        <div class="rev-card">
          <span class="rev-label">This Week</span>
          <span class="rev-value">${fmt(data.week)}</span>
        </div>
        <div class="rev-card">
          <span class="rev-label">This Month</span>
          <span class="rev-value">${fmt(data.month)}</span>
        </div>
        <div class="rev-card">
          <span class="rev-label">MRR</span>
          <span class="rev-value">${fmt(data.mrr)}</span>
        </div>
        <div class="rev-card">
          <span class="rev-label">Failed</span>
          <span class="rev-value text-red">${fmt(data.failed)}</span>
        </div>
        <div class="rev-card">
          <span class="rev-label">Refunds</span>
          <span class="rev-value text-orange">${fmt(data.refunds)}</span>
        </div>
      </div>
    `;
  });
}
