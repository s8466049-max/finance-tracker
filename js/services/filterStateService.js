// ════════════════════════════════════════════════════════════════
//  FILTER STATE SERVICE — Centralized filter state per module
//  Eliminates duplicated filter variables across UI files
// ════════════════════════════════════════════════════════════════

const _filterState = {};

function getFilterState(module) {
  if (!_filterState[module]) {
    _filterState[module] = {
      activeFilter: 'this-month',
      filterFrom: '',
      filterTo: '',
      searchQuery: ''
    };
  }
  return _filterState[module];
}

function setFilterPeriod(module, period) {
  const state = getFilterState(module);
  state.activeFilter = period;
}

function setFilterRange(module, from, to) {
  const state = getFilterState(module);
  state.filterFrom = from;
  state.filterTo = to;
  state.activeFilter = 'custom';
}

function setSearchQuery(module, query) {
  const state = getFilterState(module);
  state.searchQuery = (query || '').toLowerCase().trim();
}

function resetFilterState(module) {
  _filterState[module] = {
    activeFilter: 'this-month',
    filterFrom: '',
    filterTo: '',
    searchQuery: ''
  };
}
