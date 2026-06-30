import { Store } from '../store.js';
import { UI } from '../ui.js';
import { ROUTES } from '../routes.js';
import { escapeHtml } from '/js/utils.js';

let renderTimeout = null;
let lastSnapshot = '';

function render(data) {
  const container =
    UI.els.queueContainer ||
    document.getElementById('pendingDecisions');

  if (!container) return;

  // cheap dedupe (prevents useless rerenders)
  const snapshotKey = JSON.stringify(data.map(d => d.id));
  if (snapshotKey === lastSnapshot) return;
  lastSnapshot = snapshotKey;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>All caught up. No pending decisions.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(d => {
    const id = String(d.id || '');

    return `
      <div class="decision-card" data-id="${escapeHtml(id)}">

        <img
          src="${escapeHtml(d.property_photo || '/images/placeholder.jpg')}"
          alt="Property"
          loading="lazy"
        >

        <div class="decision-info">
          <div class="decision-title">
            ${escapeHtml(d.property_title || 'Untitled')}
          </div>

          <div class="decision-meta">
            <span>KES ${(Number(d.property_price || 0)).toLocaleString()}</span>
            <span>${escapeHtml(d.property_location || '')}</span>
          </div>

          <div class="decision-scores">
            <span>AI ${d.ai_score || 0}%</span>
            <span>Fraud ${d.fraud_score || 0}%</span>
          </div>
        </div>

        <div class="decision-actions">
          <a
            href="${ROUTES.moderation}?id=${encodeURIComponent(id)}"
            class="btn btn-primary"
          >
            Review
          </a>
        </div>

      </div>
    `;
  }).join('');
}

export function initQueueRenderer() {
  const update = (data) => {
    // 🧠 debounce rapid realtime bursts
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => render(data), 50);
  };

  Store.subscribe('queue', update);
}
