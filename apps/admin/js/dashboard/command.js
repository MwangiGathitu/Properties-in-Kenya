import { ROUTES } from './routes.js';
import { hasPermission } from './permissions.js';
import { showToast } from '/js/utils.js';

const COMMANDS = [
  {
    id: 'add_property',
    name: 'Add Property',
    icon: 'ti-home',
    route: ROUTES.newProperty,
    perm: 'properties'
  },
  {
    id: 'create_agent',
    name: 'Create Agent',
    icon: 'ti-user-plus',
    route: ROUTES.newAgent,
    perm: 'users'
  },
  {
    id: 'view_payments',
    name: 'View Payments',
    icon: 'ti-credit-card',
    route: ROUTES.payments,
    perm: 'finance'
  },
  {
    id: 'moderation_queue',
    name: 'Open Moderation Queue',
    icon: 'ti-list-check',
    route: ROUTES.moderation,
    perm: 'moderation'
  },
  {
    id: 'send_broadcast',
    name: 'Send Broadcast',
    icon: 'ti-send',
    route: ROUTES.broadcasts,
    perm: 'super_admin'
  },
  {
    id: 'export_analytics',
    name: 'Export Analytics',
    icon: 'ti-download',
    route: `${ROUTES.analytics}?export=csv`,
    perm: 'analytics'
  },
  {
    id: 'restart_ai',
    name: 'Restart AI Scan',
    icon: 'ti-robot',
    perm: 'super_admin',
    action: async () => {
      showToast('info', 'Processing', 'Restarting global AI scan...');
      // await callFunction('restart-ai-scan');
    }
  },
  {
    id: 'settings',
    name: 'Go to Settings',
    icon: 'ti-settings',
    route: ROUTES.settings,
    perm: 'super_admin'
  }
];

// cached filtered commands (performance win)
let cachedCommands = [];

function buildCommands() {
  cachedCommands = COMMANDS.filter(c => hasPermission(c.perm));
}

function executeCommand(cmd) {
  if (cmd.route) {
    window.location.href = cmd.route;
    return;
  }

  if (typeof cmd.action === 'function') {
    cmd.action();
  }
}

export function initCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  const list = document.getElementById('commandPaletteList');

  if (!modal || !input || !list) return;

  buildCommands();

  const render = (filter = '') => {
    const filtered = cachedCommands.filter(c =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );

    list.innerHTML = filtered.length
      ? filtered.map(c => `
          <div class="cmd-item" data-id="${c.id}">
            <i class="ti ${c.icon}"></i>
            <span>${c.name}</span>
          </div>
        `).join('')
      : `<div class="cmd-empty">No matching commands.</div>`;
  };

  const toggle = (show) => {
    modal.style.display = show ? 'flex' : 'none';

    if (show) {
      input.value = '';
      render();
      setTimeout(() => input.focus(), 50);
    }
  };

  // keyboard controls
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggle(true);
    }

    if (e.key === 'Escape') {
      toggle(false);
    }
  });

  input.addEventListener('input', (e) => {
    render(e.target.value);
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.cmd-item');
    if (!item) return;

    const cmd = cachedCommands.find(c => c.id === item.dataset.id);
    if (!cmd) return;

    toggle(false);
    executeCommand(cmd);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggle(false);
  });
}
