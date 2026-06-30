// js/dashboard/command.js
import { ROUTES } from './routes.js';
import { hasPermission } from './permissions.js';
import { showToast } from '/js/utils.js';

export function initCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  const list = document.getElementById('commandPaletteList');
  if (!modal || !input || !list) return;

  // Define all possible commands and their required permissions
  const ALL_COMMANDS = [
    { name: 'Add Property', icon: 'ti-home', route: ROUTES.newProperty, perm: 'properties' },
    { name: 'Create Agent', icon: 'ti-user-plus', route: ROUTES.newAgent, perm: 'users' },
    { name: 'View Payments', icon: 'ti-credit-card', route: ROUTES.payments, perm: 'finance' },
    { name: 'Open Moderation Queue', icon: 'ti-list-check', route: ROUTES.moderation, perm: 'moderation' },
    { name: 'Send Broadcast', icon: 'ti-send', route: ROUTES.broadcasts, perm: 'super_admin' },
    { name: 'Export Analytics', icon: 'ti-download', route: `${ROUTES.analytics}?export=csv`, perm: 'analytics' },
    { name: 'Restart AI Scan', icon: 'ti-robot', action: 'restart_ai', perm: 'super_admin' },
    { name: 'Go to Settings', icon: 'ti-settings', route: ROUTES.settings, perm: 'super_admin' }
  ];

  const getAvailableCommands = () => ALL_COMMANDS.filter(cmd => hasPermission(cmd.perm));

  const renderCommands = (filter = '') => {
    const cmds = getAvailableCommands();
    const filtered = cmds.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    
    list.innerHTML = filtered.length === 0 
      ? `<div class="cmd-empty">No matching commands.</div>`
      : filtered.map(c => `
          <div class="cmd-item" data-cmd="${c.name}">
            <i class="ti ${c.icon}"></i> <span>${c.name}</span>
          </div>
        `).join('');
  };

  const toggleModal = (show) => {
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
      input.value = '';
      renderCommands();
      setTimeout(() => input.focus(), 50);
    }
  };

  // Global keyboard listener
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleModal(true);
    }
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      toggleModal(false);
    }
  });

  input.addEventListener('input', (e) => renderCommands(e.target.value));

  list.addEventListener('click', async (e) => {
    const item = e.target.closest('.cmd-item');
    if (!item) return;

    const cmd = getAvailableCommands().find(c => c.name === item.dataset.cmd);
    if (!cmd) return;

    toggleModal(false);

    if (cmd.route) {
      window.location.href = cmd.route;
    } else if (cmd.action === 'restart_ai') {
      showToast('info', 'Processing', 'Restarting global AI scan...');
      // await callFunction('restart-ai-scan', {});
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal(false);
  });
}
