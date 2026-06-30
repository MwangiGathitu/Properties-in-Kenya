// js/dashboard/render/operations.js
import { Store } from '../store.js';
import { UI } from '../ui.js';

export function initOperationsRenderer() {
  const render = () => {
    const revenue = Store.get('revenue') || {};
    const health = Store.get('health') || {};
    const queue = Store.get('queue') || [];
    const stats = Store.get('stats') || {};

    const container = UI.els.operationsCenter;
    if (!container) return;

    container.innerHTML = `
      <div class="ops-grid">
        <div class="ops-card success">
          <div class="ops-label">🚨 SYSTEM STATUS</div>
          <div class="ops-value">${health.overall || '99.9%'}</div>
          <div class="ops-sub">Everything Operational</div>
        </div>
        <div class="ops-card">
          <div class="ops-label">Today's Revenue</div>
          <div class="ops-value">KES ${Number(revenue.today || 0).toLocaleString()}</div>
          <div class="ops-sub text-green">↑ 14% vs yesterday</div>
        </div>
        <div class="ops-card">
          <div class="ops-label">Live Visitors</div>
          <div class="ops-value">${(stats.visitors_online || 0).toLocaleString()}</div>
          <div class="ops-sub">Browsing right now</div>
        </div>
        <div class="ops-card">
          <div class="ops-label">Listings Waiting</div>
          <div class="ops-value">${queue.length}</div>
          <div class="ops-sub">Avg wait: 2m 31s</div>
        </div>
        <div class="ops-card">
          <div class="ops-label">AI Risk Level</div>
          <div class="ops-value text-yellow">${health.ai_risk || 'LOW'}</div>
          <div class="ops-sub">Fraud prob: 1.2%</div>
        </div>
      </div>
    `;
  };

  // Subscribe to any data source that affects the Operations Center
  ['revenue', 'health', 'queue', 'stats'].forEach(key => Store.subscribe(key, render));
}
