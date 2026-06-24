// ════════════════════════════════════════════════════════════════
//  FILTER SERVICE — Shared filtering & search logic
// ════════════════════════════════════════════════════════════════

function filterByDate(entries, activeFilter, filterFrom, filterTo) {
  if (activeFilter === 'this-month')  return entries.filter(e => isCurrentMonth(e.date));
  if (activeFilter === 'last-month')  return entries.filter(e => isLastMonth(e.date));
  if (activeFilter === 'custom')      return entries.filter(e => inDateRange(e.date, filterFrom, filterTo));
  return entries.slice();
}

function filterBySearch(entries, query, fields) {
  if (!query) return entries;
  const q = query.toLowerCase().trim();
  return entries.filter(e =>
    fields.some(f => ((e[f] || '') + '').toLowerCase().includes(q)) ||
    (e.date || '').includes(q)
  );
}

// ── Unified Activity Feed Builder ──────────────────────────────
function buildActivityFeed(expenses, income, limit) {
  const allItems = [
    ...expenses.map(e => ({ type: 'expense', category: e.category, amount: e.amount, date: e.date, account: e.accountId, id: e.id, createdAt: e.createdAt || e.date })),
    ...income.map(i => ({ type: 'income', category: i.source, amount: i.amount, date: i.date, account: i.accountId, id: i.id, createdAt: i.createdAt || i.date }))
  ];
  allItems.sort(sortNewestFirst);
  return limit ? allItems.slice(0, limit) : allItems;
}
