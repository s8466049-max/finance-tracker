// ════════════════════════════════════════════════════════════════
//  Storage Adapter — Pluggable persistence layer
//  Default: LocalStorageAdapter (sync, browser localStorage)
//  Future:  FirebaseAdapter, SupabaseAdapter, RestApiAdapter
//
//  All adapters expose the same async API so swapping is trivial:
//      get(key)          → Promise<any>
//      set(key, value)   → Promise<void>
//      remove(key)       → Promise<void>
//      keys()            → Promise<string[]>
//
//  For now, dataService.js continues to use localStorage directly.
//  This adapter is the migration path for backend readiness.
// ════════════════════════════════════════════════════════════════

const LocalStorageAdapter = {
  name: 'localStorage',

  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      console.error('[LocalStorageAdapter] get failed:', key, e);
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[LocalStorageAdapter] set failed:', key, e);
      if (typeof showToast === 'function') {
        showToast('Failed to save data. Storage may be full.', 'error');
      }
      throw e;
    }
  },

  async remove(key) {
    try { localStorage.removeItem(key); }
    catch (e) { console.error('[LocalStorageAdapter] remove failed:', key, e); }
  },

  async keys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      out.push(localStorage.key(i));
    }
    return out;
  }
};

// Active adapter (swap-point for future backends)
const StorageAdapter = LocalStorageAdapter;

// Synchronous shim for the current code paths that haven't been async-ified yet.
// Mirrors dataService.js behavior so adoption is incremental.
const StorageAdapterSync = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) {
      if (typeof showToast === 'function') showToast('Failed to save data.', 'error');
      console.error('[StorageAdapterSync] set failed:', key, e);
    }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};
