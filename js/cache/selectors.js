// ════════════════════════════════════════════════════════════════
//  Selectors — Cached, derived computations over AppState data
//  Memoized by data version. Auto-invalidates on AppState 'dataChanged'.
// ════════════════════════════════════════════════════════════════

const Selectors = (function () {
  const cache = new Map();
  let version = 0;

  function bump() { version++; cache.clear(); }

  // Auto-invalidate when AppState fires data changes
  if (typeof AppState !== 'undefined' && AppState.on) {
    AppState.on('dataChanged', bump);
    AppState.on('stateLoaded',  bump);
  }

  function memo(key, computeFn) {
    const fullKey = `${version}::${key}`;
    if (cache.has(fullKey)) return cache.get(fullKey);
    const result = computeFn();
    cache.set(fullKey, result);
    return result;
  }

  function ymKey(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }

  // ── Monthly expense totals: { 'YYYY-MM': total } ─────────────
  function getMonthlyExpenseTotals() {
    return memo('monthlyExpenseTotals', () => {
      const list = (AppState.getState().expenses) || [];
      const out = {};
      list.forEach(e => {
        const k = ymKey(e.date);
        if (!k) return;
        out[k] = (out[k] || 0) + (Number(e.amount) || 0);
      });
      return out;
    });
  }

  // ── Monthly income totals ────────────────────────────────────
  function getMonthlyIncomeTotals() {
    return memo('monthlyIncomeTotals', () => {
      const list = (AppState.getState().income) || [];
      const out = {};
      list.forEach(e => {
        const k = ymKey(e.date);
        if (!k) return;
        out[k] = (out[k] || 0) + (Number(e.amount) || 0);
      });
      return out;
    });
  }

  // ── Category breakdown for current month or any month ────────
  function getCategoryBreakdown(monthKey) {
    const key = monthKey || ymKey(new Date());
    return memo(`categoryBreakdown::${key}`, () => {
      const list = (AppState.getState().expenses) || [];
      const out = {};
      list.forEach(e => {
        if (ymKey(e.date) !== key) return;
        const cat = e.category || 'Other';
        out[cat] = (out[cat] || 0) + (Number(e.amount) || 0);
      });
      return out;
    });
  }

  // ── Top categories sorted desc ───────────────────────────────
  function getTopCategories(monthKey, limit) {
    const breakdown = getCategoryBreakdown(monthKey);
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit || 5)
      .map(([category, total]) => ({ category, total }));
  }

  // ── Dashboard insights snapshot ──────────────────────────────
  function getDashboardInsights() {
    return memo('dashboardInsights', () => {
      const s = AppState.getSummaries();
      const monthly = getMonthlyExpenseTotals();
      const months = Object.keys(monthly).sort();
      const thisMonth = months[months.length - 1];
      const lastMonth = months[months.length - 2];
      const thisTotal = thisMonth ? monthly[thisMonth] : 0;
      const lastTotal = lastMonth ? monthly[lastMonth] : 0;
      const changePct = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
      return {
        totalExpenses: s.totalExpenses,
        totalIncome:   s.totalIncome,
        netWorth:      s.netWorth,
        pendingLending: s.pendingLending,
        thisMonthExpenses: thisTotal,
        lastMonthExpenses: lastTotal,
        monthOverMonthChangePct: changePct,
        topCategories: getTopCategories(thisMonth, 5)
      };
    });
  }

  // ── Account totals ───────────────────────────────────────────
  function getAccountTotals() {
    return memo('accountTotals', () => {
      const accounts = (AppState.getState().accounts) || [];
      let cash = 0, credit = 0, investment = 0;
      accounts.forEach(a => {
        const bal = Number(a.balance) || 0;
        if (a.type === 'credit') credit += bal;
        else if (a.type === 'investment') investment += bal;
        else cash += bal;
      });
      return { cash, credit, investment, total: cash + investment - credit };
    });
  }

  return {
    bump,
    getMonthlyExpenseTotals,
    getMonthlyIncomeTotals,
    getCategoryBreakdown,
    getTopCategories,
    getDashboardInsights,
    getAccountTotals
  };
})();

if (typeof window !== 'undefined') window.Selectors = Selectors;
