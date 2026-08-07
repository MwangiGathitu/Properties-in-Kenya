export const Store = {
  state: {},
  listeners: {},
  _isDestroyed: false,

  get(key) {
    return this.state[key];
  },

  set(key, value) {
    if (this._isDestroyed) return;
    
    const prev = this.state[key];

    // ⛔ skip unnecessary updates
    if (this.isEqual(prev, value)) return;

    // DEV WARNING: Prevent storing mutable built-ins or Promises
    if (value && typeof value === 'object') {
      if (typeof value.then === 'function') {
        console.warn(`Store.set [${key}]: Storing a Promise is discouraged. Await the promise and store the resolved value.`);
      } else {
        const proto = Object.getPrototypeOf(value);
        if (proto === Map.prototype || proto === Set.prototype || proto === WeakMap.prototype || proto === WeakSet.prototype) {
          console.warn(`Store.set [${key}]: Storing a ${value.constructor.name} is discouraged. Direct mutations will not trigger re-renders. Use plain objects or arrays.`);
        }
      }
    }

    this.state[key] = value;
    this.notify(key, value);
  },

  /**
   * Updates state using an updater function.
   * WARNING: Do not mutate `current` directly. Always return a new object/array reference.
   * Example: `Store.update('list', l => [...l, newItem])`
   */
  update(key, updaterFn) {
    if (this._isDestroyed) return;
    
    try {
      const current = this.state[key];
      
      // REMOVED: Misleading shallow clone. Developers must use immutable patterns.
      const next = updaterFn(current);
      
      // Prevent storing Promises in state and catch async rejections
      if (next && typeof next.then === 'function') {
        console.warn(`Store.update [${key}]: updaterFn returned a Promise. State updaters should be synchronous.`);
        next.catch(e => console.error(`Store async update error [${key}]:`, e));
        return;
      }
      
      this.set(key, next);
    } catch (e) {
      console.error(`Store update error [${key}]:`, e);
    }
  },

  subscribe(key, callback) {
    if (this._isDestroyed) return () => {};
    
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }

    // Wrap callback to safely handle synchronous throws and async rejections
    const wrappedCb = (value) => {
      try {
        const result = callback(value);
        if (result && typeof result.then === 'function') {
          result.catch(e => console.error(`Store async listener error [${key}]:`, e));
        }
      } catch (e) {
        console.error(`Store listener error [${key}]:`, e);
      }
    };
    
    wrappedCb._original = callback;
    this.listeners[key].push(wrappedCb);

    // FIXED: Defer hydration to prevent synchronous infinite loops if callback triggers set()
    if (key in this.state) {
      queueMicrotask(() => {
        // Verify still subscribed and store not destroyed before hydrating
        if (!this._isDestroyed && this.listeners[key] && this.listeners[key].includes(wrappedCb)) {
          wrappedCb(this.state[key]);
        }
      });
    }

    // return unsubscribe function (IMPORTANT)
    return () => {
      if (this.listeners[key]) {
        this.listeners[key] = this.listeners[key].filter(cb => cb !== wrappedCb);
        
        if (this.listeners[key].length === 0) {
          delete this.listeners[key];
        }
      }
    };
  },

  notify(key, value) {
    const listeners = this.listeners[key];
    if (!listeners) return;

    const listenersToNotify = [...listeners];
    listenersToNotify.forEach(cb => cb(value));
  },

  // Clears state and listeners for dashboard teardown and bfcache cleanup
  clear() {
    this.state = {};
    this.listeners = {};
    this._isDestroyed = false; // Reset for new session
  },
  
  // Permanently locks the store to prevent ghost async updates after logout
  destroy() {
    this.clear();
    this._isDestroyed = true;
  },

  // shallow comparison (fast + sufficient for dashboards)
  isEqual(a, b) {
    if (Object.is(a, b)) return true; 
    
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }

    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

    if (a instanceof Date) return a.getTime() === b.getTime();
    
    const proto = Object.getPrototypeOf(a);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
      return false; 
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    for (const k of aKeys) {
      // FIXED: Verify key actually exists in B to prevent undefined mismatch bypass
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!Object.is(a[k], b[k])) return false;
    }

    return true;
  }
};
