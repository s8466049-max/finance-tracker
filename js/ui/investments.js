// ════════════════════════════════════════════════════════════════
//  INVESTMENTS UI — Rendering & event handling
// ════════════════════════════════════════════════════════════════

let _editingInvId = null;
let _editingFdId  = null;
let _editingRdId  = null;
let _allocChart   = null;
let _perfChart    = null;

// ── Init ───────────────────────────────────────────────────────
(function init() {
  document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fdStartDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('rdStartDate').value = new Date().toISOString().split('T')[0];
  renderAllInvestmentSections();
  // Record today's portfolio snapshot for historical tracking
  if (typeof recordPortfolioSnapshot === 'function') recordPortfolioSnapshot();

  // Pre-fill from calculator navigation
  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');
  if (from === 'sip-calc') {
    const sipAmount     = params.get('sipAmount');
    const sipDay        = params.get('sipDay');
    const investedAmount = params.get('investedAmount');
    const currentValue  = params.get('currentValue');
    populateMFFromCalculator(null, investedAmount, currentValue, sipAmount, sipDay);
  } else if (from === 'lump-calc') {
    const investedAmount = params.get('investedAmount');
    const currentValue  = params.get('currentValue');
    populateMFFromCalculator(null, investedAmount, currentValue, null, null);
  }
  // Clean up URL after reading params
  if (from && window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();

// ── Tab Switching ──────────────────────────────────────────────
function switchInvestmentTab(tabName) {
  // Hide all tab contents
  document.getElementById('tab-mutual-funds').classList.remove('inv-tab-content--active');
  document.getElementById('tab-fixed-deposits').classList.remove('inv-tab-content--active');
  document.getElementById('tab-recurring-deposits').classList.remove('inv-tab-content--active');

  // Remove active class from all tabs
  document.querySelectorAll('.inv-tab').forEach(tab => {
    tab.classList.remove('inv-tab--active');
  });

  // Show selected tab content
  const tabId = 'tab-' + tabName;
  document.getElementById(tabId).classList.add('inv-tab-content--active');

  // Mark tab button as active
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('inv-tab--active');

  syncInvestmentChartVisibility(hasAnyInvestmentData());
}

// ── FD Date & Tenure Calculation ──────────────────────────────
function calculateFDMaturityDate() {
  const startDate = document.getElementById('fdStartDate').value;
  const tenure = Number(document.getElementById('fdTenure').value);
  
  if (startDate && tenure > 0) {
    const [year, month, day] = startDate.split('-').map(Number);
    const maturity = new Date(Date.UTC(year, (month - 1) + tenure, day));
    const maturityDateStr = [
      maturity.getUTCFullYear(),
      String(maturity.getUTCMonth() + 1).padStart(2, '0'),
      String(maturity.getUTCDate()).padStart(2, '0')
    ].join('-');
    document.getElementById('fdMaturityDate').value = maturityDateStr;
  }
}

function calculateFDTenure() {
  const startDate = document.getElementById('fdStartDate').value;
  const maturityDate = document.getElementById('fdMaturityDate').value;
  
  if (startDate && maturityDate) {
    const start = new Date(startDate);
    const maturity = new Date(maturityDate);
    const monthsDiff = (maturity.getFullYear() - start.getFullYear()) * 12 + 
                      (maturity.getMonth() - start.getMonth());
    if (monthsDiff > 0) {
      document.getElementById('fdTenure').value = monthsDiff;
    }
  }
}

function renderAllInvestmentSections() {
  renderSummary();
  renderList();
  renderFDList();
  renderRDList();
  renderCharts();
  renderInvestmentInsights();
  renderMaturityTimeline();
}

function hasAnyInvestmentData() {
  return getAllInvestments().length > 0 || getAllFDs().length > 0 || getAllRDs().length > 0;
}

function syncInvestmentChartVisibility(hasData) {
  const chartsSection = document.getElementById('invChartsSection');
  chartsSection.style.display = hasData && document.querySelector('.inv-tab--active')?.dataset.tab === 'mutual-funds' ? '' : 'none';
}

function getInvestmentSnapshot() {
  const investments = getAllInvestments();
  const fds = getAllFDs();
  const rds = getAllRDs();

  const mfInvested = investments.reduce((sum, investment) => sum + Number(investment.investedAmount || 0), 0);
  const mfCurrent = investments.reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0);
  const fdInvested = fds.reduce((sum, fd) => sum + Number(fd.amount || 0), 0);
  const fdCurrent = fds.reduce((sum, fd) => sum + calculateFDMaturityValue(fd), 0);
  const rdInvested = rds.reduce((sum, rd) => sum + calculateRDTotalInvested(rd), 0);
  const rdCurrent = rds.reduce((sum, rd) => sum + calculateRDMaturityValue(rd), 0);

  const totalInvested = mfInvested + fdInvested + rdInvested;
  const totalCurrent = mfCurrent + fdCurrent + rdCurrent;
  const totalGain = totalCurrent - totalInvested;
  const overallReturn = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

  return {
    investments,
    fds,
    rds,
    mfInvested,
    mfCurrent,
    fdInvested,
    fdCurrent,
    rdInvested,
    rdCurrent,
    totalInvested,
    totalCurrent,
    totalGain,
    overallReturn
  };
}

function formatSignedPercentage(value, opts) {
  const pct = Number(value || 0);
  if (pct > 0) return '+' + formatPercentage(pct, opts);
  if (pct < 0) return '-' + formatPercentage(Math.abs(pct), opts);
  return formatPercentage(0, opts);
}

function getDaysRemainingLabel(daysRemaining, status) {
  if (status === 'Closed') return 'Closed';
  if (daysRemaining == null) return '—';
  if (daysRemaining < 0) return `Matured ${Math.abs(daysRemaining)}d ago`;
  if (daysRemaining === 0) return 'Matures today';
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
}

function getInvestmentPerformanceItems() {
  const investments = getAllInvestments().map(investment => {
    const invested = Number(investment.investedAmount || 0);
    const current = Number(investment.currentValue || 0);
    const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    return {
      name: investment.fundName,
      category: investment.fundType || 'Mutual Fund',
      invested,
      current,
      returnPct
    };
  });

  const fds = getAllFDs().map(fd => {
    const invested = Number(fd.amount || 0);
    const current = calculateFDMaturityValue(fd);
    const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    return {
      name: fd.bankName,
      category: 'Fixed Deposit',
      invested,
      current,
      returnPct
    };
  });

  const rds = getAllRDs().map(rd => {
    const invested = calculateRDTotalInvested(rd);
    const current = calculateRDMaturityValue(rd);
    const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    return {
      name: rd.bankName,
      category: 'Recurring Deposit',
      invested,
      current,
      returnPct
    };
  });

  return [...investments, ...fds, ...rds].filter(item => item.current > 0 || item.invested > 0);
}

// ── Tab Switching ──────────────────────────────────────────────

// ── Summary Cards ──────────────────────────────────────────────
function renderSummary() {
  const { totalInvested, totalCurrent, totalGain, overallReturn } = getInvestmentSnapshot();

  document.getElementById('invTotalInvested').textContent = fmt(totalInvested);
  document.getElementById('invCurrentValue').textContent  = fmt(totalCurrent);
  document.getElementById('invTotalGain').textContent     = fmt(Math.abs(totalGain));

  const gainCard   = document.getElementById('invGainCard');
  const returnCard = document.getElementById('invReturnCard');
  const returnEl   = document.getElementById('invOverallReturn');

  if (totalGain >= 0) {
    gainCard.classList.remove('expense');
    gainCard.classList.add('savings');
    returnCard.classList.remove('expense');
    returnCard.classList.add('income');
    returnEl.style.color = 'var(--success)';
  } else {
    gainCard.classList.remove('savings');
    gainCard.classList.add('expense');
    returnCard.classList.remove('income');
    returnCard.classList.add('expense');
    returnEl.style.color = 'var(--danger)';
  }

  const sign = totalGain >= 0 ? '+' : '-';
  document.getElementById('invTotalGain').textContent = sign + fmt(Math.abs(totalGain));
  returnEl.textContent = formatSignedPercentage(overallReturn);
}

// ── Table ──────────────────────────────────────────────────────
function renderList() {
  const investments = getAllInvestments();
  const tbody  = document.getElementById('invList');
  const empty  = document.getElementById('invEmptyMsg');

  if (!investments.length) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = investments.map(inv => {
    const invested = Number(inv.investedAmount || 0);
    const current  = Number(inv.currentValue   || 0);
    const gain     = current - invested;
    const ret      = invested > 0 ? ((gain / invested) * 100) : 0;
    const gainCls  = gain >= 0 ? 'amount-positive' : 'amount-negative';
    const gainSign = gain >= 0 ? '+' : '';
    const typeColor = getFundTypeColor(inv.fundType);

    return `<tr>
      <td data-label="Fund / Asset">
        <div style="font-weight:600;">${escapeHtml(inv.fundName)}</div>
        ${inv.notes ? `<div style="font-size:11px;color:var(--text-muted);">${escapeHtml(inv.notes)}</div>` : ''}
      </td>
      <td data-label="Type"><span class="inv-type-badge" style="background:${typeColor}15;color:${typeColor};">${escapeHtml(inv.fundType || '—')}</span></td>
      <td data-label="Invested">${fmt(invested)}</td>
      <td data-label="Current Value">${fmt(current)}</td>
      <td data-label="Gain / Loss"><span class="${gainCls}">${gainSign}${fmt(Math.abs(gain))}</span></td>
      <td data-label="Return %"><span class="${gainCls} inv-return-pct">${formatSignedPercentage(ret)}</span></td>
      <td data-label="">
        <button class="btn-icon" onclick="startEditInvestment('${inv.id}')" title="Edit">&#9998;</button>
        <button class="btn-icon btn-icon--danger" onclick="deleteInvestment('${inv.id}')" title="Delete">&#128465;</button>
      </td>
    </tr>
    ${inv.sipAmount && Number(inv.sipAmount) > 0 ? `<tr style="background:rgba(26,115,232,0.04);"><td colspan="7" style="font-size:12px;color:var(--text-secondary);padding:8px 14px;">🔄 SIP: ${fmt(Number(inv.sipAmount))}/month • Scheduled for day ${inv.sipDay}</td></tr>` : ''}
    `;
  }).join('');
}

// ── Charts ─────────────────────────────────────────────────────
function renderCharts() {
  const investments = getAllInvestments();
  const fds         = getAllFDs();
  const rds         = getAllRDs();
  const chartsSection  = document.getElementById('invChartsSection');
  const hasData = investments.length > 0 || fds.length > 0 || rds.length > 0;

  syncInvestmentChartVisibility(hasData);
  if (!hasData) {
    if (_allocChart) { _allocChart.destroy(); _allocChart = null; }
    if (_perfChart) { _perfChart.destroy(); _perfChart = null; }
    return;
  }

  // Calculate totals
  let mfValue = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
  
  let fdValue = 0;
  fds.forEach(fd => {
    fdValue += calculateFDMaturityValue(fd);
  });

  let rdValue = 0;
  rds.forEach(rd => {
    rdValue += calculateRDMaturityValue(rd);
  });

  // ── Investment Type Allocation Pie (MF/FD/RD) ──────────────
  const allocCtx = document.getElementById('invAllocationChart').getContext('2d');
  const typeData = [];
  const typeLabels = [];
  const typeColors = ['#1a73e8', '#1b9e4b', '#e8780a'];
  
  if (mfValue > 0) { typeLabels.push('Mutual Funds'); typeData.push(mfValue); }
  if (fdValue > 0) { typeLabels.push('Fixed Deposits'); typeData.push(fdValue); }
  if (rdValue > 0) { typeLabels.push('Recurring Deposits'); typeData.push(rdValue); }

  if (_allocChart) _allocChart.destroy();
  _allocChart = new Chart(allocCtx, {
    type: 'doughnut',
    data: {
      labels: typeLabels,
      datasets: [{
        data: typeData,
        backgroundColor: typeColors.slice(0, typeLabels.length),
        borderWidth: 2,
        borderColor: document.body.classList.contains('dark') ? '#1a1d27' : '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = typeData.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (ctx.raw / total) * 100 : 0;
              return ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + formatPercentage(pct) + ')';
            }
          }
        }
      }
    }
  });

  // ── MF Fund Performance Bar ────────────────────────────────
  const sorted = [...investments].sort((a, b) => {
    const ra = Number(a.investedAmount) > 0 ? ((Number(a.currentValue) - Number(a.investedAmount)) / Number(a.investedAmount)) * 100 : 0;
    const rb = Number(b.investedAmount) > 0 ? ((Number(b.currentValue) - Number(b.investedAmount)) / Number(b.investedAmount)) * 100 : 0;
    return rb - ra;
  });
  const topN = sorted.slice(0, 8);
  const returns = topN.map(inv => {
    const inv_a = Number(inv.investedAmount || 0);
    const cur   = Number(inv.currentValue   || 0);
    return inv_a > 0 ? parseFloat((((cur - inv_a) / inv_a) * 100).toFixed(2)) : 0;
  });
  const barColors = returns.map(r => r >= 0 ? '#1b9e4b' : '#dc3545');

  const perfCtx = document.getElementById('invPerformanceChart').getContext('2d');
  if (_perfChart) _perfChart.destroy();
  _perfChart = new Chart(perfCtx, {
    type: 'bar',
    data: {
      labels: topN.map(inv => inv.fundName.length > 15 ? inv.fundName.slice(0, 15) + '…' : inv.fundName),
      datasets: [{
        label: 'Return %',
        data: returns,
        backgroundColor: barColors,
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + formatPercentage(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { ticks: { callback: v => formatPercentage(v), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
}

function renderInvestmentInsights() {
  const section = document.getElementById('invInsightSection');
  const grid = document.getElementById('invInsightGrid');
  const snapshot = getInvestmentSnapshot();
  const performanceItems = getInvestmentPerformanceItems();

  if (!hasAnyInvestmentData()) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  const best = [...performanceItems].sort((a, b) => b.returnPct - a.returnPct)[0];
  const largest = [...performanceItems].sort((a, b) => b.current - a.current)[0];
  const allocationItems = [
    { label: 'Mutual Funds', value: snapshot.mfCurrent },
    { label: 'Fixed Deposits', value: snapshot.fdCurrent },
    { label: 'Recurring Deposits', value: snapshot.rdCurrent }
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const largestAllocation = allocationItems[0];
  const allocationPct = snapshot.totalCurrent > 0 && largestAllocation ? (largestAllocation.value / snapshot.totalCurrent) * 100 : 0;

  const cards = [];
  if (best) {
    cards.push(`<div class="inv-stat-card">
      <div class="inv-stat-label">Best Performer</div>
      <div class="inv-stat-value">${escapeHtml(best.name)}</div>
      <div class="inv-stat-meta">${escapeHtml(best.category)} • ${formatSignedPercentage(best.returnPct)} return</div>
    </div>`);
  }

  if (largest) {
    cards.push(`<div class="inv-stat-card">
      <div class="inv-stat-label">Largest Holding</div>
      <div class="inv-stat-value">${fmt(largest.current)}</div>
      <div class="inv-stat-meta">${escapeHtml(largest.name)} • ${escapeHtml(largest.category)}</div>
    </div>`);
  }

  if (largestAllocation) {
    cards.push(`<div class="inv-stat-card">
      <div class="inv-stat-label">Allocation Insight</div>
      <div class="inv-stat-value">${formatPercentage(allocationPct)}</div>
      <div class="inv-stat-meta">${escapeHtml(largestAllocation.label)} lead your portfolio at ${formatCompactCurrency(largestAllocation.value)}.</div>
    </div>`);
  }

  cards.push(`<div class="inv-stat-card">
    <div class="inv-stat-label">Portfolio Return</div>
    <div class="inv-stat-value ${snapshot.totalGain >= 0 ? 'amount-positive' : 'amount-negative'}">${formatSignedPercentage(snapshot.overallReturn)}</div>
    <div class="inv-stat-meta">Invested ${fmt(snapshot.totalInvested)} • Current ${fmt(snapshot.totalCurrent)} • Gain ${snapshot.totalGain >= 0 ? '+' : '-'}${fmt(Math.abs(snapshot.totalGain))}</div>
  </div>`);

  // Historical growth card from snapshots
  if (typeof getPortfolioGrowthStats === 'function') {
    const growth = getPortfolioGrowthStats();
    if (growth) {
      const best = [
        { label: '1Y', val: growth.growth1y },
        { label: '6M', val: growth.growth6m },
        { label: '3M', val: growth.growth3m },
        { label: '1M', val: growth.growth1m }
      ].find(g => g.val !== null);
      if (best) {
        const cls = best.val >= 0 ? 'amount-positive' : 'amount-negative';
        cards.push(`<div class="inv-stat-card">
          <div class="inv-stat-label">Portfolio Growth (${best.label})</div>
          <div class="inv-stat-value ${cls}">${formatSignedPercentage(best.val)}</div>
          <div class="inv-stat-meta">Tracking since ${growth.oldestDate}</div>
        </div>`);
      }
    }
  }

  section.style.display = '';
  grid.innerHTML = cards.join('');
}

function renderMaturityTimeline() {
  const section = document.getElementById('invTimelineSection');
  const list = document.getElementById('invTimelineList');
  const timelineItems = [];

  getAllFDs().forEach(fd => {
    const date = getFDMaturityDate(fd);
    if (!date) return;
    timelineItems.push({
      label: fd.bankName,
      type: 'FD',
      date,
      meta: `${fmt(Number(fd.amount || 0))} principal • ${getDaysRemainingLabel(getDaysUntilDate(date), getFDStatus(fd))}`
    });
  });

  getAllRDs().forEach(rd => {
    const date = getRDMaturityDate(rd);
    if (!date) return;
    timelineItems.push({
      label: rd.bankName,
      type: 'RD',
      date,
      meta: `${fmt(Number(rd.monthlyDeposit || 0))}/mo • ${calculateRDMonthsRemaining(rd)} month${calculateRDMonthsRemaining(rd) === 1 ? '' : 's'} remaining`
    });
  });

  timelineItems.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!timelineItems.length) {
    section.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  section.style.display = '';
  list.innerHTML = timelineItems.slice(0, 8).map(item => `
    <div class="inv-timeline-item">
      <div>
        <div class="inv-timeline-title">${escapeHtml(item.label)} <span class="inv-type-badge">${item.type}</span></div>
        <div class="inv-timeline-meta">${escapeHtml(item.meta)}</div>
      </div>
      <div class="inv-timeline-date">${item.date}</div>
    </div>
  `).join('');
}

// ── Add / Update Investment ────────────────────────────────────
function addOrUpdateInvestment() {
  const fundName      = document.getElementById('invFundName').value.trim();
  const fundType      = document.getElementById('invFundType').value;
  const investedAmt   = parseFloat(document.getElementById('invInvestedAmount').value);
  const currentVal    = parseFloat(document.getElementById('invCurrentValueInput').value);
  const units         = parseFloat(document.getElementById('invUnits').value) || 0;
  const date          = document.getElementById('invDate').value;
  const sipAmount     = parseFloat(document.getElementById('invSIPAmount').value) || 0;
  const sipDay        = parseInt(document.getElementById('invSIPDate').value) || 0;
  const notes         = document.getElementById('invNotes').value.trim();

  if (!fundName)              { showToast('Enter a fund/asset name.',     'error'); return; }
  if (!fundType)              { showToast('Select a fund type.',          'error'); return; }
  if (isNaN(investedAmt) || investedAmt <= 0) { showToast('Enter a valid invested amount.', 'error'); return; }
  if (isNaN(currentVal)  || currentVal  <  0) { showToast('Enter a valid current value.',   'error'); return; }
  if (sipAmount > 0 && (sipDay < 1 || sipDay > 31)) { showToast('SIP day must be 1-31.',         'error'); return; }

  const list = getAllInvestments();

  if (_editingInvId) {
    const idx = list.findIndex(i => i.id === _editingInvId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], fundName, fundType, investedAmount: investedAmt, currentValue: currentVal, units, date, sipAmount, sipDay, notes };
    }
  } else {
    list.push({
      id: generateId(),
      fundName, fundType,
      investedAmount: investedAmt,
      currentValue:   currentVal,
      units, date, sipAmount, sipDay, notes,
      createdAt: nowTimestamp()
    });
  }

  saveAllInvestments(list);
  invalidateInvestmentsCache();
  resetInvForm();
  showToast(_editingInvId ? 'Investment updated.' : `${fundName} added.`, 'success');
  _editingInvId = null;
  renderAllInvestmentSections();
}

// ── Edit Investment ────────────────────────────────────────────
function startEditInvestment(id) {
  const inv = getInvestmentById(id);
  if (!inv) return;
  _editingInvId = id;

  document.getElementById('invFundName').value           = inv.fundName;
  document.getElementById('invFundType').value           = inv.fundType || '';
  document.getElementById('invInvestedAmount').value     = inv.investedAmount;
  document.getElementById('invCurrentValueInput').value  = inv.currentValue;
  document.getElementById('invUnits').value              = inv.units || '';
  document.getElementById('invDate').value               = inv.date  || '';
  document.getElementById('invSIPAmount').value          = inv.sipAmount || '';
  document.getElementById('invSIPDate').value            = inv.sipDay || '';
  document.getElementById('invNotes').value              = inv.notes || '';

  document.getElementById('invFormTitle').textContent = 'Edit Investment';
  document.getElementById('invSubmitBtn').textContent = 'Update';
  document.getElementById('invCancelBtn').style.display = '';
  document.getElementById('invFundName').focus();
  document.querySelector('.dash-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditInvestment() {
  _editingInvId = null;
  resetInvForm();
}

function resetInvForm() {
  document.getElementById('invFundName').value          = '';
  document.getElementById('invFundType').value          = '';
  document.getElementById('invInvestedAmount').value    = '';
  document.getElementById('invCurrentValueInput').value = '';
  document.getElementById('invUnits').value             = '';
  document.getElementById('invDate').value              = new Date().toISOString().split('T')[0];
  document.getElementById('invSIPAmount').value         = '';
  document.getElementById('invSIPDate').value           = '';
  document.getElementById('invNotes').value             = '';
  document.getElementById('invFormTitle').textContent   = 'Add Investment';
  document.getElementById('invSubmitBtn').textContent   = 'Add Investment';
  document.getElementById('invCancelBtn').style.display = 'none';
}

// ── Delete Investment ──────────────────────────────────────────
function deleteInvestment(id) {
  const inv = getInvestmentById(id);
  if (!inv) return;
  if (!confirm(`Delete "${inv.fundName}"?`)) return;
  const list = getAllInvestments().filter(i => i.id !== id);
  saveAllInvestments(list);
  invalidateInvestmentsCache();
  showToast(`${inv.fundName} deleted.`, 'success');
  renderAllInvestmentSections();
}

// ════════════════════════════════════════════════════════════════
//  FIXED DEPOSITS (FD) CRUD
// ════════════════════════════════════════════════════════════════

function renderFDList() {
  const fds   = getAllFDs();
  const tbody = document.getElementById('fdList');
  const empty = document.getElementById('fdEmptyMsg');

  if (!fds.length) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = fds.map(fd => {
    const amount     = Number(fd.amount || 0);
    const rate       = Number(fd.rate || 0);
    const interest   = calculateFDInterestEarned(fd);
    const maturity   = calculateFDMaturityValue(fd);
    const maturityDate = getFDMaturityDate(fd);
    const status = getFDStatus(fd);
    const daysRemaining = getDaysUntilDate(maturityDate);
    const statusColor = status === 'Active' ? '#1b9e4b' : status === 'Matured' ? '#8c93a4' : '#dc3545';

    return `<tr>
      <td data-label="Bank">
        <div style="font-weight:600;">${escapeHtml(fd.bankName || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted);">${formatPercentage(rate)} p.a. • ${formatPercentage(calculateFDEffectiveYield(fd))} yield</div>
      </td>
      <td data-label="Principal">${fmt(amount)}</td>
      <td data-label="Interest">${fmt(interest)}</td>
      <td data-label="Maturity Date">${maturityDate || '—'}</td>
      <td data-label="Maturity Value">${fmt(maturity)}</td>
      <td data-label="Days Remaining">${getDaysRemainingLabel(daysRemaining, status)}</td>
      <td data-label="Status"><span class="inv-type-badge" style="background:${statusColor}20;color:${statusColor};">${status}</span></td>
      <td data-label="">
        <button class="btn-icon" onclick="startEditFD('${fd.id}')" title="Edit">&#9998;</button>
        <button class="btn-icon btn-icon--danger" onclick="deleteFD('${fd.id}')" title="Delete">&#128465;</button>
      </td>
    </tr>`;
  }).join('');
}

function addOrUpdateFD() {
  const bankName     = document.getElementById('fdBankName').value.trim();
  const amount       = parseFloat(document.getElementById('fdAmount').value);
  const rate         = parseFloat(document.getElementById('fdRate').value);
  const startDate    = document.getElementById('fdStartDate').value;
  const maturityDate = document.getElementById('fdMaturityDate').value;
  const tenure       = parseFloat(document.getElementById('fdTenure').value);
  const interestType = document.getElementById('fdInterestType').value;
  const notes        = document.getElementById('fdNotes').value.trim();

  if (!bankName)                           { showToast('Enter bank name.',                'error'); return; }
  if (isNaN(amount) || amount <= 0)        { showToast('Enter a valid deposit amount.',  'error'); return; }
  if (isNaN(rate) || rate < 0)             { showToast('Enter a valid interest rate.',   'error'); return; }
  if (!startDate)                          { showToast('Enter start date.',               'error'); return; }
  if (!maturityDate)                       { showToast('Enter maturity date.',            'error'); return; }
  if (isNaN(tenure) || tenure < 1)         { showToast('Enter valid tenure in months.',  'error'); return; }
  if (!interestType)                       { showToast('Select interest type.',           'error'); return; }

  const list = getAllFDs();

  if (_editingFdId) {
    const idx = list.findIndex(f => f.id === _editingFdId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], bankName, amount, rate, startDate, maturityDate, tenure, interestType, notes };
    }
  } else {
    list.push({
      id: generateId(),
      bankName, amount, rate,
      startDate, maturityDate, tenure,
      interestType, notes,
      status: 'Active',
      createdAt: nowTimestamp()
    });
  }

  saveAllFDs(list);
  invalidateFDCache();
  invalidateInvestmentsCache();
  resetFDForm();
  showToast(_editingFdId ? 'FD updated.' : `FD added for ${bankName}.`, 'success');
  _editingFdId = null;
  renderAllInvestmentSections();
}

function startEditFD(id) {
  const fd = getFDById(id);
  if (!fd) return;
  _editingFdId = id;

  document.getElementById('fdBankName').value     = fd.bankName;
  document.getElementById('fdAmount').value       = fd.amount;
  document.getElementById('fdRate').value         = fd.rate;
  document.getElementById('fdStartDate').value    = fd.startDate;
  document.getElementById('fdMaturityDate').value = fd.maturityDate;
  document.getElementById('fdTenure').value       = fd.tenure;
  document.getElementById('fdInterestType').value = fd.interestType || '';
  document.getElementById('fdNotes').value        = fd.notes || '';

  document.querySelector('[id="fdSubmitBtn"]').textContent = 'Update FD';
  document.getElementById('fdCancelBtn').style.display = '';
  document.getElementById('fdBankName').focus();
  document.querySelector('div.dash-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditFD() {
  _editingFdId = null;
  resetFDForm();
}

function resetFDForm() {
  document.getElementById('fdBankName').value     = '';
  document.getElementById('fdAmount').value       = '';
  document.getElementById('fdRate').value         = '';
  document.getElementById('fdStartDate').value    = new Date().toISOString().split('T')[0];
  document.getElementById('fdMaturityDate').value = '';
  document.getElementById('fdTenure').value       = '';
  document.getElementById('fdInterestType').value = '';
  document.getElementById('fdNotes').value        = '';
  document.querySelector('[id="fdSubmitBtn"]').textContent = 'Add FD';
  document.getElementById('fdCancelBtn').style.display = 'none';
}

function deleteFD(id) {
  const fd = getFDById(id);
  if (!fd) return;
  if (!confirm(`Delete FD at ${fd.bankName}?`)) return;
  const list = getAllFDs().filter(f => f.id !== id);
  saveAllFDs(list);
  invalidateFDCache();
  invalidateInvestmentsCache();
  showToast(`FD deleted.`, 'success');
  renderAllInvestmentSections();
}

// ════════════════════════════════════════════════════════════════
//  RECURRING DEPOSITS (RD) CRUD
// ════════════════════════════════════════════════════════════════

function renderRDList() {
  const rds   = getAllRDs();
  const tbody = document.getElementById('rdList');
  const empty = document.getElementById('rdEmptyMsg');

  if (!rds.length) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = rds.map(rd => {
    const monthly    = Number(rd.monthlyDeposit || 0);
    const tenure     = Number(rd.tenure || 12);
    const depositedTillDate = calculateRDDepositedTillDate(rd);
    const monthsRemaining = calculateRDMonthsRemaining(rd);
    const maturity = calculateRDMaturityValue(rd);
    const status = getRDStatus(rd);
    const statusColor = status === 'Active' ? '#1b9e4b' : status === 'Matured' ? '#8c93a4' : '#dc3545';

    return `<tr>
      <td data-label="Bank">
        <div style="font-weight:600;">${escapeHtml(rd.bankName || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted);">${fmt(monthly)}/month • ${tenure} months</div>
      </td>
      <td data-label="Monthly Deposit">${fmt(monthly)}</td>
      <td data-label="Deposited Till Date">${fmt(depositedTillDate)}</td>
      <td data-label="Months Remaining">${monthsRemaining}</td>
      <td data-label="Expected Maturity">${fmt(maturity)}</td>
      <td data-label="Status"><span class="inv-type-badge" style="background:${statusColor}20;color:${statusColor};">${status}</span></td>
      <td data-label="">
        <button class="btn-icon" onclick="startEditRD('${rd.id}')" title="Edit">&#9998;</button>
        <button class="btn-icon btn-icon--danger" onclick="deleteRD('${rd.id}')" title="Delete">&#128465;</button>
      </td>
    </tr>`;
  }).join('');
}

function addOrUpdateRD() {
  const bankName       = document.getElementById('rdBankName').value.trim();
  const monthlyDeposit = parseFloat(document.getElementById('rdMonthlyDeposit').value);
  const rate           = parseFloat(document.getElementById('rdRate').value);
  const tenure         = parseFloat(document.getElementById('rdTenure').value);
  const startDate      = document.getElementById('rdStartDate').value;
  const notes          = document.getElementById('rdNotes').value.trim();

  if (!bankName)                           { showToast('Enter bank name.',                'error'); return; }
  if (isNaN(monthlyDeposit) || monthlyDeposit <= 0) { showToast('Enter a valid monthly deposit.',   'error'); return; }
  if (isNaN(rate) || rate < 0)             { showToast('Enter a valid interest rate.',   'error'); return; }
  if (isNaN(tenure) || tenure < 1)         { showToast('Enter valid tenure in months.',  'error'); return; }
  if (!startDate)                          { showToast('Enter start date.',               'error'); return; }

  const list = getAllRDs();

  if (_editingRdId) {
    const idx = list.findIndex(r => r.id === _editingRdId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], bankName, monthlyDeposit, rate, tenure, startDate, notes };
    }
  } else {
    list.push({
      id: generateId(),
      bankName, monthlyDeposit, rate, tenure,
      startDate, notes,
      createdAt: nowTimestamp()
    });
  }

  saveAllRDs(list);
  invalidateRDCache();
  invalidateInvestmentsCache();
  resetRDForm();
  showToast(_editingRdId ? 'RD updated.' : `RD added for ${bankName}.`, 'success');
  _editingRdId = null;
  renderAllInvestmentSections();
}

function startEditRD(id) {
  const rd = getRDById(id);
  if (!rd) return;
  _editingRdId = id;

  document.getElementById('rdBankName').value       = rd.bankName;
  document.getElementById('rdMonthlyDeposit').value = rd.monthlyDeposit;
  document.getElementById('rdRate').value           = rd.rate;
  document.getElementById('rdTenure').value         = rd.tenure;
  document.getElementById('rdStartDate').value      = rd.startDate;
  document.getElementById('rdNotes').value          = rd.notes || '';

  document.querySelector('[id="rdSubmitBtn"]').textContent = 'Update RD';
  document.getElementById('rdCancelBtn').style.display = '';
  document.getElementById('rdBankName').focus();
  document.querySelector('div.dash-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditRD() {
  _editingRdId = null;
  resetRDForm();
}

function resetRDForm() {
  document.getElementById('rdBankName').value       = '';
  document.getElementById('rdMonthlyDeposit').value = '';
  document.getElementById('rdRate').value           = '';
  document.getElementById('rdTenure').value         = '';
  document.getElementById('rdStartDate').value      = new Date().toISOString().split('T')[0];
  document.getElementById('rdNotes').value          = '';
  document.querySelector('[id="rdSubmitBtn"]').textContent = 'Add RD';
  document.getElementById('rdCancelBtn').style.display = 'none';
}

function deleteRD(id) {
  const rd = getRDById(id);
  if (!rd) return;
  if (!confirm(`Delete RD at ${rd.bankName}?`)) return;
  const list = getAllRDs().filter(r => r.id !== id);
  saveAllRDs(list);
  invalidateRDCache();
  invalidateInvestmentsCache();
  showToast(`RD deleted.`, 'success');
  renderAllInvestmentSections();
}

// ── Helpers ────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getFundTypeColor(type) {
  const colors = {
    'Large Cap': '#1a73e8', 'Mid Cap': '#e8780a', 'Small Cap': '#dc3545',
    'Flexi Cap': '#8b5cf6', 'Index': '#1b9e4b',   'Hybrid': '#14b8a6',
    'Debt': '#6366f1',      'Sectoral': '#ec4899', 'Stocks': '#f59e0b',
    'Gold': '#d97706',      'International Funds': '#0f766e', 'ETF': '#0284c7',
    'REIT': '#7c3aed',      'NPS': '#475569', 'PPF': '#65a30d', 'Other': '#8c93a4'
  };
  return colors[type] || '#8c93a4';
}

// ── Calculator → Investment Import ─────────────────────────────
/**
 * Called from calculators view to pre-fill the FD form with calculator results.
 * Opens investments.html at the FD tab with fields pre-populated.
 */
function populateFDFromCalculator(principal, rate, tenureMonths, startDate) {
  try {
    if (principal)     document.getElementById('fdPrincipal').value    = principal;
    if (rate)          document.getElementById('fdRate').value          = rate;
    if (tenureMonths)  document.getElementById('fdTenure').value        = tenureMonths;
    if (startDate)     document.getElementById('fdStartDate').value     = startDate;
    calculateFDMaturityDate();
    switchInvestmentTab('fixed-deposits');
    document.getElementById('fdPrincipal').focus();
    document.getElementById('fdPrincipal').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('FD details pre-filled from calculator.', 'success');
  } catch (e) {
    console.warn('populateFDFromCalculator: could not pre-fill', e);
  }
}

/**
 * Called from calculators view to pre-fill the RD form with calculator results.
 */
function populateRDFromCalculator(monthlyDeposit, rate, tenureMonths, startDate) {
  try {
    if (monthlyDeposit) document.getElementById('rdMonthlyDeposit').value = monthlyDeposit;
    if (rate)            document.getElementById('rdRate').value            = rate;
    if (tenureMonths)    document.getElementById('rdTenure').value          = tenureMonths;
    if (startDate)       document.getElementById('rdStartDate').value       = startDate;
    switchInvestmentTab('recurring-deposits');
    document.getElementById('rdMonthlyDeposit').focus();
    document.getElementById('rdMonthlyDeposit').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('RD details pre-filled from calculator.', 'success');
  } catch (e) {
    console.warn('populateRDFromCalculator: could not pre-fill', e);
  }
}

/**
 * Called from SIP / Lump Sum calculators to pre-fill the Mutual Fund form.
 */
function populateMFFromCalculator(fundName, investedAmount, currentValue, sipAmount, sipDay) {
  try {
    if (fundName)       document.getElementById('invFundName').value           = fundName;
    if (investedAmount) document.getElementById('invInvestedAmount').value     = investedAmount;
    if (currentValue)   document.getElementById('invCurrentValueInput').value  = currentValue;
    if (sipAmount)      document.getElementById('invSIPAmount').value          = sipAmount;
    if (sipDay)         document.getElementById('invSIPDate').value            = sipDay;
    document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
    switchInvestmentTab('mutual-funds');
    document.getElementById('invFundName').focus();
    document.getElementById('invFundName').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('SIP/MF details pre-filled from calculator.', 'success');
  } catch (e) {
    console.warn('populateMFFromCalculator: could not pre-fill', e);
  }
}
