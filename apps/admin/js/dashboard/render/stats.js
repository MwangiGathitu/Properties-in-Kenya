// js/dashboard/render/stats.js
import { Store } from '../store.js';
import { UI } from '../ui.js';

export function initStatsRenderer() {
  Store.subscribe('stats', (data) => {
    if (!data) return UI.showErrorState('statsContainer', 'Stats unavailable');

    UI.updateText('statTotal', data.total?.toLocaleString() || 0);
    UI.updateText('statPending', data.pending?.toLocaleString() || 0);
    UI.updateText('statApproved', data.approved?.toLocaleString() || 0);
    UI.updateText('statRate', `${data.approval_rate || 0}%`);
  });
}
