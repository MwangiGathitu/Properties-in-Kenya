import { Store } from '../store.js';
import { UI } from '../ui.js';

let lastData = null;

function hasChanged(next, prev) {
  if (!prev) return true;

  return (
    next.total !== prev.total ||
    next.pending !== prev.pending ||
    next.approved !== prev.approved ||
    next.approval_rate !== prev.approval_rate
  );
}

export function initStatsRenderer() {
  Store.subscribe('stats', (data) => {
    if (!data) {
      UI.showErrorState('statsContainer', 'Stats unavailable');
      return;
    }

    // ⛔ skip unnecessary DOM updates
    if (!hasChanged(data, lastData)) return;
    lastData = { ...data };

    UI.updateText('statTotal', (data.total || 0).toLocaleString());
    UI.updateText('statPending', (data.pending || 0).toLocaleString());
    UI.updateText('statApproved', (data.approved || 0).toLocaleString());
    UI.updateText('statRate', `${data.approval_rate || 0}%`);
  });
}
