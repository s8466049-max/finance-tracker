// ════════════════════════════════════════════════════════════════
//  APP STATE — Centralized state coordination & event system
//  Load once on app start, update centrally, trigger UI refresh
// ════════════════════════════════════════════════════════════════

const AppState = (function () {
  // ── Internal state snapshot ──────────────────────────────────
  let _state = {
    accounts: [],
    expenses: [],
    income: [],
    lendings: [],
    recurring: [],
    budgets: {},
    summaries: {
      totalExpenses: 0,
      totalIncome: 0,
      netWorth: 0,
      pendingLending: 0
    }
  };

  // ── Event listeners ──────────────────────────────────────────
  const _listeners = {};

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error('AppState listener error:', e); }
    });
  }

  // ── Load all data into state ─────────────────────────────────
  function load() {
    _state.accounts = getAllAccounts();
    _state.expenses = getAllExpenses();
    _state.income = getAllIncome();
    _state.lendings = getAllLendings();
    _state.recurring = getAllRecurring();
    _state.budgets = getAllBudgets();
    _computeSummaries();
    emit('stateLoaded', _state);
  }

  function _computeSummaries() {
    _state.summaries.totalExpenses = getTotalAmount(_state.expenses);
    _state.summaries.totalIncome = getTotalAmount(_state.income);
    _state.summaries.netWorth = getNetWorth();
    _state.summaries.pendingLending = _state.lendings
      .filter(l => l.status === 'pending')
      .reduce((s, l) => s + l.remainingAmount, 0);
  }

  // ── Notify state changed (call after CRUD operations) ───────
  function notify(changeType) {
    // Refresh all caches
    refreshAll();

    // Reload state
    _state.accounts = getAllAccounts();
    _state.expenses = getAllExpenses();
    _state.income = getAllIncome();
    _state.lendings = getAllLendings();
    _state.recurring = getAllRecurring();
    _state.budgets = getAllBudgets();
    _computeSummaries();

    emit('dataChanged', { type: changeType, state: _state });
  }

  // ── Getters ──────────────────────────────────────────────────
  function getState() { return _state; }
  function getSummaries() { return _state.summaries; }

  // ── Subscribe: domain-scoped event-driven render hook ───────
  // Usage: AppState.subscribe('expenses', renderExpenses)
  //   → callback fires immediately (with current state) AND
  //     on every relevant 'dataChanged' event.
  // Returns an unsubscribe function.
  const _DOMAIN_TYPES = {
    expenses: ['expenseAdded','expenseUpdated','expenseDeleted','expense'],
    income:   ['incomeAdded','incomeUpdated','incomeDeleted','income'],
    accounts: ['accountAdded','accountUpdated','accountDeleted','account'],
    lendings: ['lendingAdded','lendingUpdated','lendingDeleted','lending'],
    recurring:['recurringAdded','recurringUpdated','recurringDeleted','recurring'],
    budgets:  ['budgetUpdated','budget'],
    all:      null // matches every change
  };
  function subscribe(domain, callback) {
    if (typeof callback !== 'function') return function noop() {};
    const triggers = _DOMAIN_TYPES[domain];
    const handler = (payload) => {
      const t = payload && payload.type;
      if (!triggers || (t && triggers.some(x => t === x || t.startsWith(x)))) {
        try { callback(_state, payload); } catch (e) { console.error('subscribe handler error:', e); }
      }
    };
    on('dataChanged', handler);
    on('stateLoaded', () => callback(_state, { type: 'stateLoaded' }));
    // fire once with current state
    try { callback(_state, { type: 'initial' }); } catch (e) { console.error(e); }
    return () => off('dataChanged', handler);
  }

  // ── Auto-load on script inclusion ────────────────────────────
  load();

  return {
    load,
    notify,
    getState,
    getSummaries,
    on,
    off,
    emit,
    subscribe
  };
})();
