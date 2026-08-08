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

let controller = null;
let focusRafId = null;

function getAvailableCommands() {
  return COMMANDS.filter(c => {
    const result = hasPermission(c.perm);
    // Fail closed if permission check is async to prevent UI bypass
    if (result instanceof Promise) {
      console.error(`hasPermission('${c.perm}') returned a Promise. Command palette requires synchronous checks.`);
      return false; 
    }
    return !!result;
  });
}

async function executeCommand(cmd) {
  if (cmd.route) {
    // TODO: Replace with client-side router (e.g., router.push(cmd.route)) to preserve SPA state
    window.location.href = cmd.route;
    return;
  }

  if (typeof cmd.action === 'function') {
    try {
      await cmd.action();
    } catch (err) {
      console.error('Command action failed:', err);
      showToast('error', 'Error', err?.message || 'Action failed. Please try again.');
    }
  }
}

export function initCommandPalette() {
  // Cleanup previous instance if it exists (SPA safety)
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  const { signal } = controller;

  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  const list = document.getElementById('commandPaletteList');

  if (!modal || !input || !list) return;

  // Accessibility: Add ARIA roles
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Command Palette');
  
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'commandPaletteList');
  input.setAttribute('aria-expanded', 'false');
  
  list.setAttribute('role', 'listbox');

  let selectedIndex = 0;
  let currentFiltered = [];

  const updateActiveItem = () => {
    const items = Array.from(list.querySelectorAll('.cmd-item'));
    items.forEach((el, i) => {
      const isActive = i === selectedIndex;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-selected', isActive.toString());
    });
    
    const activeEl = items[selectedIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', activeEl.id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const render = (filter = '') => {
    const availableCommands = getAvailableCommands();
    currentFiltered = availableCommands.filter(c =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (selectedIndex >= currentFiltered.length) {
      selectedIndex = Math.max(0, currentFiltered.length - 1);
    }

    list.innerHTML = currentFiltered.length
      ? currentFiltered.map((c, i) => `
          <div class="cmd-item ${i === selectedIndex ? 'active' : ''}" 
               id="cmd-item-${c.id}"
               data-id="${c.id}" 
               role="option" 
               aria-selected="${i === selectedIndex}">
            <i class="ti ${c.icon}" aria-hidden="true"></i>
            <span>${c.name}</span>
          </div>
        `).join('')
      : `<div class="cmd-empty" role="status">No matching commands.</div>`;
      
    if (currentFiltered.length > 0) {
      updateActiveItem();
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const getFocusableElements = () => {
    return Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => {
        if (el.disabled) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        // Ensure element has dimensions and is not hidden via visibility/display
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      });
  };

  const toggle = (show) => {
    if (focusRafId) {
      cancelAnimationFrame(focusRafId);
      focusRafId = null;
    }

    modal.style.display = show ? 'flex' : 'none';
    modal.setAttribute('aria-hidden', (!show).toString());
    input.setAttribute('aria-expanded', show.toString());

    if (show) {
      input.value = '';
      selectedIndex = 0;
      render();
      focusRafId = requestAnimationFrame(() => {
        if (modal.style.display === 'flex') {
          input.focus();
        }
        focusRafId = null;
      });
    }
  };

  // Global keyboard controls
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      
      // Allow native editor shortcuts if user is typing in a text area
      if (isEditable) return; 

      e.preventDefault();
      toggle(modal.style.display !== 'flex');
    }

    if (e.key === 'Escape' && modal.style.display === 'flex') {
      toggle(false);
    }
  }, { signal });

  // Input interactions
  input.addEventListener('input', (e) => {
    selectedIndex = 0;
    render(e.target.value);
  }, { signal });

  input.addEventListener('keydown', (e) => {
    const items = Array.from(list.querySelectorAll('.cmd-item'));
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateActiveItem();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = items[selectedIndex];
      if (activeItem) {
        const cmd = currentFiltered.find(c => c.id === activeItem.dataset.id);
        if (cmd) {
          toggle(false);
          executeCommand(cmd);
        }
      }
    }
  }, { signal });

  // Proper Focus Trap
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, { signal });

  // Mouse interactions
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.cmd-item');
    if (!item) return;

    const cmd = currentFiltered.find(c => c.id === item.dataset.id);
    if (!cmd) return;

    toggle(false);
    executeCommand(cmd);
  }, { signal });

  list.addEventListener('mousemove', (e) => {
    const item = e.target.closest('.cmd-item');
    if (!item) return;
    const items = Array.from(list.querySelectorAll('.cmd-item'));
    const newIndex = items.indexOf(item);
    if (newIndex !== -1 && newIndex !== selectedIndex) {
      selectedIndex = newIndex;
      updateActiveItem();
    }
  }, { signal });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggle(false);
  }, { signal });
}

export function destroyCommandPalette() {
  if (controller) {
    controller.abort();
    controller = null;
  }
  if (focusRafId) {
    cancelAnimationFrame(focusRafId);
    focusRafId = null;
  }
}
