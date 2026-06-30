// js/dashboard/ui.js
import { showToast } from '/js/utils.js';

export const UI = {
  els: {}, // Cached DOM elements

  // 7. Centralize DOM access (Run once on boot)
  cacheElements() {
    const ids = [
      'statTotal', 'statPending', 'kpiRevenue', 'operationsCenter', 
      'alerts', 'activityFeed', 'healthChart', 'globalLoading', 'offlineBanner'
    ];
    ids.forEach(id => this.els[id] = document.getElementById(id));
  },

  // 8. Reusable helpers
  updateText(id, value, fallback = '—') {
    const el = this.els[id] || document.getElementById(id);
    if (el) el.textContent = value ?? fallback;
  },

  // 10. Graceful fallbacks
  showErrorState(containerId, message, retryFnName) {
    const el = this.els[containerId] || document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="module-error-state">
        <i class="ti ti-alert-triangle"></i>
        <p>${message}</p>
        ${retryFnName ? `<button class="btn-retry" onclick="${retryFnName}">Retry</button>` : ''}
      </div>
    `;
  },

  // 15. Offline awareness
  initOfflineAwareness() {
    const banner = this.els.offlineBanner;
    if (!banner) return;

    const updateStatus = () => {
      const isOffline = !navigator.onLine;
      banner.classList.toggle('active', isOffline);
      banner.textContent = isOffline ? '⚠️ Offline Mode: Real-time updates paused.' : '';
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }
};
