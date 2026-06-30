import { Store } from '../store.js';
import { UI } from '../ui.js';

let lastRenderKey = '';

function getSnapshot() {
  return {
    revenue: Store.get('revenue') || {},
    health: Store.get('health') || {},
    queue: Store.get('queue') || [],
    stats: Store.get('stats') || {}
  };
}

function computeKey(data) {
  // cheap hash to prevent unnecessary DOM redraws
  return JSON.stringify({
    r: data.revenue.today,
    h: data.health.overall,
    q: data.queue.length,
    s: data.stats.visitors_online
  });
}

function render(data) {
  const container = UI.els.operationsCenter;
  if (!container) return;

  const key = computeKey(data);

  // ⛔ prevent useless rerenders
  if (key === lastRenderKey) return;
  lastRenderKey = key;

  container.innerHTML = `
    <div class="ops-grid">

      <div class="ops-card success">
        <div class="ops-label">SYSTEM STATUS</div>
        <div class="ops-value">${data.health.overall || '99.9%'}</div>
        <div class="ops-sub">All systems running</div>
      </div>

      <div class="ops-card">
        <div class="ops-label">Today Revenue</div>
        <div class="ops-value">
          KES ${(data.revenue.today || 0).toLocaleString()}
        </div>
      </div>

      <div class="ops-card">
        <div class="ops-label">Live Visitors</div>
        <div class="ops-value">
          ${(data.stats.visitors_online || 0).toLocaleString()}
        </div>
      </div>

      <div class="ops-card">
        <div class="ops-label">Queue</div>
        <div class="ops-value">${data.queue.length}</div>
      </div>

      <div class="ops-card">
        <div class="ops-label">AI Risk</div>
        <div class="ops-value">${data.health.ai_risk || 'LOW'}</div>
      </div>

    </div>
  `;
}

export function initOperationsRenderer() {
  const update = () => render(getSnapshot());

  // single shared subscriber (cleaner + cheaper)
  const unsubscribeFns = [
    Store.subscribe('revenue', update),
    Store.subscribe('health', update),
    Store.subscribe('queue', update),
    Store.subscribe('stats', update)
  ];

  // optional: expose cleanup hook
  return () => unsubscribeFns.forEach(fn => fn && fn());
}
