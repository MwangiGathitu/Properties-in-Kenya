export const Store = {
  state: {},
  listeners: {},

  // track last values for change detection
  lastEmitted: {},

  get(key) {
    return this.state[key];
  },

  set(key, value) {
    const prev = this.state[key];

    // ⛔ skip unnecessary updates
    if (this.isEqual(prev, value)) return;

    this.state[key] = value;
    this.notify(key, value);
  },

  update(key, updaterFn) {
    const current = this.state[key];
    const next = updaterFn(current);

    this.set(key, next);
  },

  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }

    this.listeners[key].push(callback);

    // immediate hydration
    if (this.state[key] !== undefined) {
      callback(this.state[key]);
    }

    // return unsubscribe function (IMPORTANT)
    return () => {
      this.listeners[key] = this.listeners[key]
        .filter(cb => cb !== callback);
    };
  },

  notify(key, value) {
    const listeners = this.listeners[key];
    if (!listeners) return;

    listeners.forEach(cb => {
      try {
        cb(value);
      } catch (e) {
        console.error(`Store error [${key}]:`, e);
      }
    });
  },

  // shallow comparison (fast + sufficient for dashboards)
  isEqual(a, b) {
    if (a === b) return true;

    if (typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }

    if (!a || !b) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }

    return true;
  }
};
