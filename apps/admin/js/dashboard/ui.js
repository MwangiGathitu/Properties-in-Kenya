import { showToast } from '/js/utils.js';

export const UI = {
  els: {},
  offlineHandler: null,

  // DOM caching (single source of truth)
  cacheElements() {
    const ids = [
      'statTotal',
      'statPending',
      'kpiRevenue',
      'operationsCenter',
      'alerts',
      'activityFeed',
      'healthChart',
      'globalLoading',
      'offlineBanner'
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.els[id] = el;
    });
  },

  // strict cached access (no fallback lookups)
  get(id) {
    return this.els[id] || null;
  },

  updateText(id, value, fallback = '—') {
    const el = this.get(id);
    if (!el) return;

    el.textContent = value ?? fallback;
  },

  showErrorState(containerId, message, retryFn) {
    const el = this.get(containerId);
    if (!el) return;

    const retryButton = retryFn
      ? `<button class="btn-retry" data-retry="${containerId}">Retry</button>`
      : '';

    el.innerHTML = `
      <div class="module-error-state">
        <i class="ti ti-alert-triangle"></i>
        <p>${message}</p>
        ${retryButton}
      </div>
    `;

    // attach safe event listener instead of inline onclick
    if (retryFn) {
      el.querySelector('.btn-retry')?.addEventListener('click', retryFn);
    }
  },

  initOfflineAwareness() {
    const banner = this.get('offlineBanner');
    if (!banner) return;

    const updateStatus = () => {
      const isOffline = !navigator.onLine;

      banner.classList.toggle('active', isOffline);
      banner.textContent = isOffline
        ? '⚠️ Offline Mode: Real-time updates paused.'
        : '';
    };

    this.offlineHandler = updateStatus;

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    updateStatus();
  },

  // optional cleanup (important for SPA behavior)
  destroy() {
    if (this.offlineHandler) {
      window.removeEventListener('online', this.offlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
};
