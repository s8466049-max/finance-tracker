// ════════════════════════════════════════════════════════════════
//  INCOME SERVICE — Filtering, sorting & processing logic
//  UI should call these instead of doing filtering itself
// ════════════════════════════════════════════════════════════════

function getFilteredIncome() {
  const state = getFilterState('income');
  let filtered = filterByDate(getAllIncome(), state.activeFilter, state.filterFrom, state.filterTo);
  filtered = filterBySearch(filtered, state.searchQuery, ['source']);
  filtered.sort(sortNewestFirst);
  return filtered;
}

function getIncomeSummary() {
  const filtered = getFilteredIncome();
  return {
    items: filtered,
    total: getTotalAmount(filtered),
    count: filtered.length
  };
}

function getIncomeSourceBreakdown() {
  const filtered = getFilteredIncome();
  const sources = {};
  filtered.forEach(e => {
    sources[e.source] = (sources[e.source] || 0) + Number(e.amount);
  });
  return sources;
}

function setIncomeFilter(period) {
  setFilterPeriod('income', period);
}

function setIncomeCustomRange(from, to) {
  setFilterRange('income', from, to);
}

function setIncomeSearch(query) {
  setSearchQuery('income', query);
}
