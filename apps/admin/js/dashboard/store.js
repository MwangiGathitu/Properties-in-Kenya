// js/dashboard/store.js
export const Store = {
  state: {},
  listeners: {},
  
  get(key) { return this.state[key]; },

  set(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  },

  // Allows optimistic updates (e.g., adding revenue without an API call)
  update(key, updaterFn) {
    this.state[key] = updaterFn(this.state[key]);
    this.notify(key, this.state[key]);
  },

  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
    
    // Fire immediately if data already exists in store
    if (this.state[key] !== undefined) callback(this.state[key]);
  },

  notify(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => {
        try { cb(value); } catch (e) { console.error(`Store error [${key}]:`, e); }
      });
    }
  }
};
