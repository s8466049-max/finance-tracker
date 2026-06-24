// ════════════════════════════════════════════════════════════════
//  ANALYTICS UI — Charts & payment method analysis
// ════════════════════════════════════════════════════════════════

const CHART_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04',
  '#ff6d00', '#9c27b0', '#00bcd4', '#607d8b'
];

// ── Analytics Cache ────────────────────────────────────────────
// Compute shared data once per page load to avoid repeated loops
const _analyticsCache = (function buildAnalyticsCache() {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevDate = new Date(curYear, curMonth - 1, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();

  const monthExp = getMonthlyExpenses(curMonth, curYear);
  const monthInc = getMonthlyIncome(curMonth, curYear);
  const prevMonthExp = getMonthlyExpenses(prevMonth, prevYear);
  const totalExp = getTotalAmount(monthExp);
  const totalInc = getTotalAmount(monthInc);
  const prevTotalExp = getTotalAmount(prevMonthExp);
  const catTotals = getCategoryTotals(monthExp);
  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  // Account totals for current month expenses
  const accountTypeTotals = { credit: 0, bank: 0, cash: 0, none: 0 };
  const accountNameTotals = {};
  monthExp.forEach(e => {
    const acc = e.accountId ? getAccountById(e.accountId) : null;
    const type = acc ? acc.type : 'none';
    accountTypeTotals[type] += Number(e.amount);
    const name = acc ? acc.name : 'Unassigned';
    accountNameTotals[name] = (accountNameTotals[name] || 0) + Number(e.amount);
  });

  return {
    curMonth, curYear, prevMonth, prevYear,
    monthExp, monthInc, prevMonthExp,
    totalExp, totalInc, prevTotalExp,
    catTotals, sortedCats,
    accountTypeTotals, accountNameTotals
  };
})();

// ── Natural Language Summary ─────────────────────────────────────────
(function renderNLPSummary() {
  const el = document.getElementById('analyticsNLP');
  if (!el) return;
  const { totalExp, totalInc, prevTotalExp, catTotals, sortedCats, monthExp } = _analyticsCache;
  if (totalExp === 0 && totalInc === 0) { el.style.display = 'none'; return; }
  const parts = [];
  if (totalExp > 0) parts.push('You spent <strong>' + fmt(totalExp) + '</strong> this month');
  if (prevTotalExp > 0 && totalExp > 0) {
    const pct = Math.round(((totalExp - prevTotalExp) / prevTotalExp) * 100);
    if (pct > 0) parts.push('<span class="nlp-up">&uarr; ' + pct + '% from last month</span>');
    else if (pct < 0) parts.push('<span class="nlp-down">&darr; ' + Math.abs(pct) + '% from last month</span>');
    else parts.push('Same as last month');
  }
  if (sortedCats.length > 0) {
    const topCat = sortedCats[0];
    const topPct = Math.round((catTotals[topCat] / totalExp) * 100);
    parts.push('Top category: <span class="nlp-highlight">' + topCat + '</span> (' + topPct + '%)');
  }
  if (monthExp.length > 0) {
    const acctCounts = {};
    monthExp.forEach(function(e) { var n = e.accountId ? getAccountName(e.accountId) : ''; if (n && n !== '(Deleted Account)') acctCounts[n] = (acctCounts[n] || 0) + 1; });
    const topAcct = Object.keys(acctCounts).sort((a, b) => acctCounts[b] - acctCounts[a])[0];
    if (topAcct) parts.push('Most used: <span class="nlp-highlight">' + topAcct + '</span>');
  }
  el.innerHTML = '<div class="analytics-nlp-text">' + parts.join(' &middot; ') + '</div>';
})();

// ── Analytics Summary ──────────────────────────────────────────
(function renderAnalyticsSummary() {
  const summaryEl = document.getElementById('analyticsSummary');
  if (!summaryEl) return;
  const { totalExp, totalInc } = _analyticsCache;
  const net = totalInc - totalExp;
  summaryEl.innerHTML = `
    <div class="analytics-summary-card">
      <span class="analytics-summary-label">This Month's Spending</span>
      <span class="analytics-summary-value analytics-summary-expense">${fmt(totalExp)}</span>
    </div>
    <div class="analytics-summary-card">
      <span class="analytics-summary-label">This Month's Income</span>
      <span class="analytics-summary-value analytics-summary-income">${fmt(totalInc)}</span>
    </div>
    <div class="analytics-summary-card">
      <span class="analytics-summary-label">Net</span>
      <span class="analytics-summary-value" style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(net)}</span>
    </div>
  `;
})();

// ── Monthly Bar Chart ──────────────────────────────────────────
function buildMonthlyData() {
  const expenses = getAllExpenses();
  const months   = {};
  expenses.forEach(e => {
    const d   = new Date(e.date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    months[key] = (months[key] || 0) + Number(e.amount);
  });
  const sorted = Object.keys(months).sort();
  return {
    labels: sorted.map(k => {
      const [y, m] = k.split('-');
      return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    }),
    data: sorted.map(k => months[k])
  };
}

function buildCategoryData(month, year) {
  const entries = getMonthlyExpenses(month, year);
  const totals  = getCategoryTotals(entries);
  return { labels: Object.keys(totals), data: Object.values(totals) };
}

const monthly = buildMonthlyData();
if (monthly.labels.length === 0) {
  document.getElementById('monthlyEmpty').style.display = 'block';
  document.getElementById('monthlyChart').style.display = 'none';
} else {
  new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels: monthly.labels,
      datasets: [{
        label: 'Expenses (₹)',
        data: monthly.data,
        backgroundColor: '#ea433599',
        borderColor: '#ea4335',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v } } }
    }
  });
}

// ── Category Doughnut ──────────────────────────────────────────
let catChart = null;

function renderCategoryChart() {
  const sel    = document.getElementById('catMonthSelect');
  const [y, m] = sel.value.split('-');
  const cat    = buildCategoryData(parseInt(m) - 1, parseInt(y));

  document.getElementById('categoryEmpty').style.display = 'none';
  document.getElementById('categoryChart').style.display = 'block';

  if (cat.labels.length === 0) {
    document.getElementById('categoryEmpty').style.display = 'block';
    document.getElementById('categoryChart').style.display = 'none';
    if (catChart) { catChart.destroy(); catChart = null; }
    return;
  }

  if (catChart) catChart.destroy();
  catChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: cat.labels,
      datasets: [{
        data: cat.data,
        backgroundColor: CHART_COLORS.slice(0, cat.labels.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } }
      }
    }
  });
}

(function initMonthSelect() {
  const expenses = getAllExpenses();
  const months   = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
  const sel      = document.getElementById('catMonthSelect');
  const now      = new Date();
  const current  = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const allMonths = months.includes(current) ? months : [current, ...months];

  allMonths.forEach(mo => {
    const [yr, mn] = mo.split('-');
    const label = new Date(yr, mn - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const opt   = document.createElement('option');
    opt.value   = mo;
    opt.textContent = label;
    if (mo === current) opt.selected = true;
    sel.appendChild(opt);
  });

  renderCategoryChart();
})();

// ── Spending by Payment Method ─────────────────────────────────
const ACCT_TYPE_COLORS = { credit: '#ea4335', bank: '#1a73e8', cash: '#34a853', none: '#9e9e9e' };
const ACCT_TYPE_LABELS = { credit: 'Credit Card', bank: 'Bank Account', cash: 'Cash', none: 'Unassigned' };
const ACCT_NAME_COLORS = [
  '#1a73e8', '#ea4335', '#34a853', '#fbbc04',
  '#ff6d00', '#9c27b0', '#00bcd4', '#607d8b',
  '#e91e63', '#795548', '#4caf50', '#3f51b5'
];

let acctChart     = null;
let acctNameChart = null;

function populateAcctSpecificFilter() {
  const sel = document.getElementById('acctSpecific');
  const typeFilter = document.getElementById('acctTypeFilter').value;
  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All Accounts';
  sel.appendChild(all);
  let accounts = getAllAccounts();
  if (typeFilter && typeFilter !== 'none') {
    accounts = accounts.filter(a => a.type === typeFilter);
  } else if (typeFilter === 'none') {
    accounts = [];
  }
  if (accounts.length === 0 && typeFilter) {
    const noOpt = document.createElement('option');
    noOpt.value = '';
    noOpt.textContent = 'No accounts available';
    noOpt.disabled = true;
    sel.appendChild(noOpt);
  }
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name + ' (' + ACCT_TYPE_LABELS[acc.type] + ')';
    sel.appendChild(opt);
  });
  sel.value = '';
}

function getAcctFilteredExpenses() {
  const period   = document.getElementById('acctPeriod').value;
  const typeF    = document.getElementById('acctTypeFilter').value;
  const specific = document.getElementById('acctSpecific').value;
  let filtered   = getAllExpenses();

  if (period === 'this-month') {
    filtered = filtered.filter(e => isCurrentMonth(e.date));
  } else if (period === 'last-month') {
    filtered = filtered.filter(e => isLastMonth(e.date));
  } else if (period === 'custom') {
    const from = document.getElementById('acctFrom').value;
    const to   = document.getElementById('acctTo').value;
    filtered = filtered.filter(e => inDateRange(e.date, from, to));
  }

  if (typeF === 'none') {
    filtered = filtered.filter(e => !e.accountId);
  } else if (typeF) {
    const accIds = new Set(getAllAccounts().filter(a => a.type === typeF).map(a => a.id));
    filtered = filtered.filter(e => accIds.has(e.accountId));
  }

  if (specific) {
    filtered = filtered.filter(e => e.accountId === specific);
  }

  return filtered;
}

function resolveAccountType(accountId) {
  if (!accountId) return 'none';
  const acc = getAccountById(accountId);
  return acc ? acc.type : 'none';
}

function renderAcctSummary(expenses) {
  const byType = { credit: 0, bank: 0, cash: 0, none: 0 };
  expenses.forEach(e => {
    const t = resolveAccountType(e.accountId);
    byType[t] += Number(e.amount);
  });
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const cards = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, val]) => {
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return `<div class="acct-summary-card" style="border-top: 3px solid ${ACCT_TYPE_COLORS[type]}">
        <div class="acct-summary-label">${ACCT_TYPE_LABELS[type]}</div>
        <div class="acct-summary-value">${fmt(val)}</div>
        <div class="acct-summary-pct">${pct}%</div>
      </div>`;
    });

  if (total > 0) {
    cards.unshift(`<div class="acct-summary-card acct-summary-total">
      <div class="acct-summary-label">Total</div>
      <div class="acct-summary-value">${fmt(total)}</div>
      <div class="acct-summary-pct">${expenses.length} transactions</div>
    </div>`);
  }

  document.getElementById('acctSummaryCards').innerHTML = cards.join('');
}

function renderAcctChart(expenses) {
  const byType = {};
  expenses.forEach(e => {
    const t = resolveAccountType(e.accountId);
    byType[t] = (byType[t] || 0) + Number(e.amount);
  });

  const types  = Object.keys(byType);
  const labels = types.map(t => ACCT_TYPE_LABELS[t]);
  const data   = types.map(t => byType[t]);
  const colors = types.map(t => ACCT_TYPE_COLORS[t]);

  const emptyEl = document.getElementById('acctChartEmpty');
  const canvas  = document.getElementById('acctTypeChart');

  if (types.length === 0) {
    emptyEl.style.display = 'block';
    canvas.style.display  = 'none';
    if (acctChart) { acctChart.destroy(); acctChart = null; }
    return;
  }

  emptyEl.style.display = 'none';
  canvas.style.display  = 'block';

  if (acctChart) acctChart.destroy();
  acctChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true,
      onClick(evt, elements) {
        if (!elements.length) return;
        const idx  = elements[0].index;
        const type = types[idx];
        showAcctDrilldown(expenses, type);
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = data.reduce((s, v) => s + v, 0);
              const pct   = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return ' ' + fmt(ctx.raw) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

function showAcctDrilldown(expenses, type) {
  const filtered = type
    ? expenses.filter(e => resolveAccountType(e.accountId) === type)
    : expenses;
  const section  = document.getElementById('acctDrilldown');
  const title    = document.getElementById('acctDrilldownTitle');
  const tbody    = document.getElementById('acctDrilldownBody');
  const totalEl  = document.getElementById('acctDrilldownTotal');

  if (!filtered.length) { section.style.display = 'none'; return; }

  const label = type ? ACCT_TYPE_LABELS[type] : 'All';
  title.textContent = label + ' Transactions (' + filtered.length + ')';
  tbody.innerHTML = filtered
    .sort(sortNewestFirst)
    .map(e => `<tr>
      <td data-label="Date">${e.date}</td>
      <td data-label="Category">${e.category}</td>
      <td data-label="Account">${getAccountName(e.accountId)}</td>
      <td data-label="Amount">${fmt(e.amount)}</td>
    </tr>`).join('');

  totalEl.textContent = 'Total: ' + fmt(getTotalAmount(filtered));
  section.style.display = '';
}

function onAcctFilterChange() {
  const period = document.getElementById('acctPeriod').value;
  document.getElementById('acctCustomRange').style.display = period === 'custom' ? 'flex' : 'none';

  populateAcctSpecificFilter();

  const expenses = getAcctFilteredExpenses();
  renderAcctSummary(expenses);
  renderAcctChart(expenses);
  renderAcctNameChart(expenses);
  document.getElementById('acctDrilldown').style.display = 'none';
}

function renderAcctNameChart(expenses) {
  const byAcct = {};
  expenses.forEach(e => {
    const name = e.accountId ? getAccountName(e.accountId) : 'Unassigned';
    byAcct[name] = (byAcct[name] || 0) + Number(e.amount);
  });

  const names  = Object.keys(byAcct).sort((a, b) => byAcct[b] - byAcct[a]);
  const data   = names.map(n => byAcct[n]);
  const colors = names.map((_, i) => ACCT_NAME_COLORS[i % ACCT_NAME_COLORS.length]);

  const emptyEl = document.getElementById('acctNameChartEmpty');
  const canvas  = document.getElementById('acctNameChart');

  if (names.length === 0) {
    emptyEl.style.display = 'block';
    canvas.style.display  = 'none';
    if (acctNameChart) { acctNameChart.destroy(); acctNameChart = null; }
    return;
  }

  emptyEl.style.display = 'none';
  canvas.style.display  = 'block';

  if (acctNameChart) acctNameChart.destroy();
  acctNameChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: names, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true,
      onClick(evt, elements) {
        if (!elements.length) return;
        const idx     = elements[0].index;
        const accName = names[idx];
        showAcctNameDrilldown(expenses, accName);
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = data.reduce((s, v) => s + v, 0);
              const pct   = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return ' ' + fmt(ctx.raw) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

function showAcctNameDrilldown(expenses, accName) {
  const filtered = expenses.filter(e => {
    const name = e.accountId ? getAccountName(e.accountId) : 'Unassigned';
    return name === accName;
  });
  const section = document.getElementById('acctDrilldown');
  const title   = document.getElementById('acctDrilldownTitle');
  const tbody   = document.getElementById('acctDrilldownBody');
  const totalEl = document.getElementById('acctDrilldownTotal');

  if (!filtered.length) { section.style.display = 'none'; return; }

  title.textContent = accName + ' Transactions (' + filtered.length + ')';
  tbody.innerHTML = filtered
    .sort(sortNewestFirst)
    .map(e => `<tr>
      <td data-label="Date">${e.date}</td>
      <td data-label="Category">${e.category}</td>
      <td data-label="Account">${getAccountName(e.accountId)}</td>
      <td data-label="Amount">${fmt(e.amount)}</td>
    </tr>`).join('');
  totalEl.textContent = 'Total: ' + fmt(getTotalAmount(filtered));
  section.style.display = '';
}

// Init
populateAcctSpecificFilter();
onAcctFilterChange();
