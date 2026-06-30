import { supabase } from '/js/supabase.js';
import { requireRole, logout } from '/js/auth.js';
import { showToast, escapeHtml } from '/js/utils.js';

// ─── State ──────────────────────────────────────────────
let healthChart = null;
let lastHealthKey = '';
let refreshTimeout = null;
let initialLoad = true;
let realtimeChannel = null;
let refreshQueued = false;                // FIX 1 – true debounce lock

// Cache keys for partial rendering
let lastStatsKey = '';
let lastDecisionsKey = '';
let lastAlertsKey = '';
let lastEventsKey = '';

// ─── Bootstrap ─────────────────────────────────────────
async function init() {
  const auth = await requireRole('admin');
  if (!auth) return;

  document.getElementById('adminEmail').textContent = auth.user.email;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  await safeLoadDashboard();
  initialLoad = false;
  setupRealtime();
}

// ─── Safe loader ──────────────────────────────────────
async function safeLoadDashboard() {
  try {
    await loadDashboard();
  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('error', 'Dashboard error', 'An unexpected error occurred. Please reload.');
  }
}

// ─── Core data loader ─────────────────────────────────
async function loadDashboard() {
  if (initialLoad) showLoading(true);

  const { data, error } = await supabase.rpc('get_admin_dashboard');

  if (initialLoad) showLoading(false);

  if (error) {
    showToast('error', 'Load failed', error.message);
    return;
  }

  const d = data || {};
  const stats = d.stats || {};
  const history = d.health_history || [];
  const decisions = d.pending_decisions || [];
  const alerts = d.alerts || [];
  const events = d.recent_activity || [];

  renderStats(stats);
  renderHealthChart(history);
  renderPendingDecisions(decisions);
  renderAlerts(alerts);
  renderActivityFeed(events);
}

// ─── Stats (partial render) ───────────────────────────
function renderStats(stats) {
  const key = (stats.total ?? 0) + '-' + (stats.pending ?? 0) + '-' + (stats.approval_rate ?? 0);
  if (key === lastStatsKey) return;
  lastStatsKey = key;

  document.getElementById('statTotal').textContent = stats.total ?? 0;
  document.getElementById('statPending').textContent = stats.pending ?? 0;
  document.getElementById('statApproved').textContent = stats.approved ?? 0;
  document.getElementById('statRejected').textContent = stats.rejected ?? 0;
  document.getElementById('statRate').textContent = (stats.approval_rate ?? 0) + '%';
}

// ─── Health Chart (smart update – FIX 2) ──────────────
function renderHealthChart(history) {
  const ctx = document.getElementById('healthChart').getContext('2d');

  // Skip if data hasn't changed (by snapshot timestamps)
  const currentKey = history && history.length
    ? history.map(h => h.snapshot_at).join('|')
    : '';
  if (currentKey === lastHealthKey) return;
  lastHealthKey = currentKey;

  if (!history || history.length === 0) {
    if (healthChart) {
      healthChart.destroy();
      healthChart = null;
    }
    return;
  }

  const labels = history.map(h => new Date(h.snapshot_at).toLocaleDateString()).reverse();
  const approvalRates = history.map(h => h.approval_rate).reverse();
  const fraudScores = history.map(h => h.avg_fraud_score).reverse();

  // FIX 2 – update existing chart instead of destroying
  if (!healthChart) {
    // First creation
    healthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Approval Rate %', data: approvalRates, borderColor: 'green', yAxisID: 'y' },
          { label: 'Avg Fraud Score', data: fraudScores, borderColor: 'red', yAxisID: 'y1' }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Rate' } },
          y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Score' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  } else {
    // Smart in‑place update (no destroy / recreate)
    healthChart.data.labels = labels;
    healthChart.data.datasets[0].data = approvalRates;
    healthChart.data.datasets[1].data = fraudScores;
    healthChart.update();
  }
}

// ─── Pending Decisions (partial render) ────────────────
function renderPendingDecisions(decisions) {
  const key = decisions.length + '-' + (decisions[0]?.id || '');
  if (key === lastDecisionsKey) return;
  lastDecisionsKey = key;

  const container = document.getElementById('pendingDecisions');
  container.innerHTML = '';

  if (!decisions || decisions.length === 0) {
    container.innerHTML = '<p>No pending decisions.</p>';
    return;
  }

  decisions.forEach(d => {
    container.insertAdjacentHTML('beforeend', `
      <div class="decision-card">
        <strong>${escapeHtml(d.property_title || 'Untitled')}</strong>
        <span class="badge">${escapeHtml(d.action)}</span>
        <small>${new Date(d.created_at).toLocaleString()}</small>
        <button data-action="approve-decision" data-id="${d.id}">Approve</button>
        <button data-action="reject-decision" data-id="${d.id}">Reject</button>
      </div>
    `);
  });
}

// ─── Alerts (partial render) ───────────────────────────
function renderAlerts(alerts) {
  const key = alerts.length + '-' + (alerts[0]?.id || '');
  if (key === lastAlertsKey) return;
  lastAlertsKey = key;

  const container = document.getElementById('alerts');
  container.innerHTML = '';

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<p>All clear.</p>';
    return;
  }

  alerts.forEach(a => {
    container.insertAdjacentHTML('beforeend', `
      <div class="alert-card severity-${escapeHtml(a.severity)}">
        <strong>${escapeHtml(a.title)}</strong>
        <p>${escapeHtml(a.message)}</p>
        <small>Occurrences: ${a.occurrences} | First seen: ${new Date(a.first_seen).toLocaleString()}</small>
      </div>
    `);
  });
}

// ─── Activity Feed ─────────────────────────────────────
function renderActivityFeed(events) {
  const key = events.length + '-' + (events[0]?.id || '');
  if (key === lastEventsKey) return;
  lastEventsKey = key;

  const container = document.getElementById('activityFeed');
  container.innerHTML = '';

  if (!events || events.length === 0) {
    container.innerHTML = '<p>No recent activity.</p>';
    return;
  }

  events.forEach(ev => {
    container.insertAdjacentHTML('beforeend', `
      <div class="activity-item">
        <span class="type">${escapeHtml(ev.type)}</span>
        <span class="time">${new Date(ev.created_at).toLocaleTimeString()}</span>
        <pre class="payload-pre"></pre>
      </div>
    `);
    const lastPre = container.querySelector('.activity-item:last-child .payload-pre');
    if (lastPre) {
      lastPre.textContent = typeof ev.payload === 'object'
        ? JSON.stringify(ev.payload, null, 2)
        : ev.payload;
    }
  });
}

// ─── Realtime ──────────────────────────────────────────
function setupRealtime() {
  realtimeChannel = supabase
    .channel('admin-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_decisions' }, () => requestRefresh())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'correction_inbox' }, () => requestRefresh())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => requestRefresh())
    .subscribe();
}

// FIX 1 – true debounce: only one refresh at a time, 800ms buffer
function requestRefresh() {
  if (refreshQueued) return;               // already waiting
  refreshQueued = true;

  setTimeout(async () => {
    try {
      await safeLoadDashboard();
    } finally {
      refreshQueued = false;               // release when done (or error)
    }
  }, 800);
}

// ─── Channel cleanup ───────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
});

// ─── Edge‑function caller (FIX 3 – explicit session guard) ──
async function callFunction(name, body) {
  // FIX 3 – fail gracefully if no valid session
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    showToast('error', 'Session expired', 'Please login again.');
    return null;
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (error) {
    showToast('error', 'Request failed', error.message);
    return null;
  }
  return data;
}

// ─── Action delegation ─────────────────────────────────
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'approve-decision' || action === 'reject-decision') {
    const actionType = action === 'approve-decision' ? 'approve' : 'reject';

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Processing…';

    const result = await callFunction('Super-Admin-Review', {
      decision_id: id,
      action: actionType
    });

    btn.disabled = false;
    btn.innerHTML = originalHtml;

    if (result) {
      showToast('success', 'Done', `Decision ${actionType}d.`);
      safeLoadDashboard();
    }
  }
});

// ─── Loading overlay ───────────────────────────────────
function showLoading(on) {
  document.getElementById('globalLoading').classList.toggle('active', on);
}

init();
