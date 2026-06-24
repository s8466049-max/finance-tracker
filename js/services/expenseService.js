// ════════════════════════════════════════════════════════════════
//  EXPENSE SERVICE — Filtering, sorting & processing logic
//  UI should call these instead of doing filtering itself
// ════════════════════════════════════════════════════════════════

function getFilteredExpenses() {
  const state = getFilterState('expenses');
  let filtered = filterByDate(getAllExpenses(), state.activeFilter, state.filterFrom, state.filterTo);
  filtered = filterBySearch(filtered, state.searchQuery, ['category']);
  filtered.sort(sortNewestFirst);
  return filtered;
}

function getExpenseSummary() {
  const filtered = getFilteredExpenses();
  return {
    items: filtered,
    total: getTotalAmount(filtered),
    count: filtered.length
  };
}

function getExpenseCategoryBreakdown() {
  const filtered = getFilteredExpenses();
  return getCategoryTotals(filtered);
}

function setExpenseFilter(period) {
  setFilterPeriod('expenses', period);
}

function setExpenseCustomRange(from, to) {
  setFilterRange('expenses', from, to);
}

function setExpenseSearch(query) {
  setSearchQuery('expenses', query);
}
