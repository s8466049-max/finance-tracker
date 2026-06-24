// ════════════════════════════════════════════════════════════════
//  REST API Adapter (stub) — Future backend integration target
//  Implements the same async contract as LocalStorageAdapter so the
//  active storage backend can be swapped without changing callers.
//
//  STATUS: scaffold only. Wire this up when a backend is available.
//  USAGE (future):
//      window.StorageAdapter = RestApiAdapter.configure({
//        baseUrl: 'https://api.example.com',
//        getToken: () => localStorage.getItem('auth_token')
//      });
// ════════════════════════════════════════════════════════════════

const RestApiAdapter = (function () {
  let _config = { baseUrl: '', getToken: null };

  function _headers() {
    const h = { 'Content-Type': 'application/json' };
    const tok = _config.getToken && _config.getToken();
    if (tok) h.Authorization = `Bearer ${tok}`;
    return h;
  }

  async function _fetch(path, opts) {
    if (!_config.baseUrl) throw new Error('RestApiAdapter not configured');
    const res = await fetch(_config.baseUrl + path, Object.assign({ headers: _headers() }, opts));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
  }

  const adapter = {
    name: 'restApi',
    async get(key) {
      try { return await _fetch(`/kv/${encodeURIComponent(key)}`); }
      catch (e) { console.error('[RestApiAdapter] get', e); return null; }
    },
    async set(key, value) {
      return _fetch(`/kv/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify(value)
      });
    },
    async remove(key) {
      return _fetch(`/kv/${encodeURIComponent(key)}`, { method: 'DELETE' });
    },
    async keys() {
      try { return (await _fetch('/kv')) || []; }
      catch { return []; }
    },
    configure(cfg) {
      _config = Object.assign(_config, cfg || {});
      return adapter;
    }
  };

  return adapter;
})();

if (typeof window !== 'undefined') window.RestApiAdapter = RestApiAdapter;
