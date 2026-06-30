// js/dashboard/render/queue.js
import { Store } from '../store.js';
import { UI } from '../ui.js';
import { ROUTES } from '../routes.js';
import { escapeHtml } from '/js/utils.js';

export function initQueueRenderer() {
  Store.subscribe('queue', (data) => {
    const container = UI.els.queueContainer || document.getElementById('pendingDecisions');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ti ti-checks"></i>
          <p>All caught up! No pending decisions.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(d => `
      <div class="decision-card">
        <img src="${escapeHtml(d.property_photo || '/images/placeholder.jpg')}" alt="Property">
        <div class="decision-info">
          <div class="decision-title">${escapeHtml(d.property_title || 'Untitled')}</div>
          <div class="decision-meta">
            <span>KES ${Number(d.property_price || 0).toLocaleString()}</span>
            <span>${escapeHtml(d.property_location || '')}</span>
          </div>
          <div class="decision-scores">
            <span><i class="ti ti-brain"></i> AI ${d.ai_score || 0}%</span>
            <span><i class="ti ti-shield-check"></i> Fraud ${d.fraud_score || 0}%</span>
          </div>
        </div>
        <div class="decision-actions">
          <a href="${ROUTES.moderation}?id=${d.id}" class="btn btn-primary">Review</a>
        </div>
      </div>
    `).join('');
  });
}
