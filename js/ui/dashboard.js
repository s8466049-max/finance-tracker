// ════════════════════════════════════════════════════════════════
//  DASHBOARD UI — Rendering only, all data from services
// ════════════════════════════════════════════════════════════════

const now = new Date();
const monthExp    = getMonthlyExpenses(now.getMonth(), now.getFullYear());
const monthInc    = getMonthlyIncome(now.getMonth(), now.getFullYear());
const monthExpTotal  = getTotalAmount(monthExp);
const monthIncTotal  = getTotalAmount(monthInc);
const monthlySavings = monthIncTotal - monthExpTotal;
const cashAvailable = getTotalByAccountType('bank') + getTotalByAccountType('cash');
const creditOutstanding = getTotalByAccountType('credit');
const totalInvestmentValue = getTotalInvestmentCurrentValue();
const totalNetWorth = getNetWorth();

// ── Financial Overview Cards ──────────────────────────────────
document.getElementById('availableBalance').textContent = fmt(cashAvailable);
document.getElementById('ccOutstanding').textContent    = fmt(creditOutstanding);
document.getElementById('lendingPending').textContent   = fmt(getTotalLendingPending());
document.getElementById('netWorthAmount').textContent   = fmt(totalNetWorth);

function formatSignedPct(value) {
  const pct = Number(value || 0);
  if (pct > 0) return '+' + formatPercentage(pct);
  if (pct < 0) return '-' + formatPercentage(Math.abs(pct));
  return formatPercentage(0);
}

// ── Financial Health Score ────────────────────────────────────
(function renderHealthScore() {
  const healthScoreSection = document.getElementById('healthScoreSection');
  if (!healthScoreSection) return;

  // Check if there's any meaningful data
  const hasAccounts = getAllAccounts().length > 0;
  const hasExpenses = getAllExpenses().length > 0;
  const hasIncome = getAllIncome().length > 0;
  const hasBudgets = Object.keys(getAllBudgets()).length > 0;
  const hasLending = getAllLendings().length > 0;

  const hasAnyData = hasAccounts || hasExpenses || hasIncome || hasBudgets || hasLending;

  if (!hasAnyData) {
    healthScoreSection.style.display = 'none';
    return;
  }

  healthScoreSection.style.display = '';

  // Factor 1: Savings Rate (0–30 pts)
  let savingsScore = 0;
  let savingsPct   = 0;
  if (monthIncTotal > 0) {
    savingsPct   = Math.max(0, (monthlySavings / monthIncTotal) * 100);
    savingsScore = Math.min(30, Math.round(savingsPct >= 30 ? 30 : savingsPct >= 20 ? 25 : savingsPct >= 10 ? 18 : savingsPct >= 5 ? 10 : 4));
  }

  // Factor 2: Budget Control (0–25 pts)
  let budgetScore = 0;
  let budgetPct   = 0;
  const budgets = getAllBudgets();
  const budgetCats = Object.keys(budgets);
  if (budgetCats.length) {
    let exceeded = 0, near = 0;
    budgetCats.forEach(cat => {
      const ratio = getTotalAmount(monthExp.filter(e => e.category === cat)) / budgets[cat];
      if (ratio >= 1) exceeded++;
      else if (ratio >= 0.8) near++;
    });
    const goodCats = budgetCats.length - exceeded - near;
    budgetScore = Math.round(25 * (goodCats / budgetCats.length));
    budgetPct   = (budgetScore / 25) * 100;
  } else {
    budgetScore = 12; // neutral if no budgets set
    budgetPct   = 50;
  }

  // Factor 3: Lending Exposure (0–25 pts) — lower pending = better
  const lendingPending = getTotalLendingPending();
  const availBal = getTotalByAccountType('bank') + getTotalByAccountType('cash');
  let lendingScore = 25;
  let lendingPct   = 100;
  if (availBal > 0 && lendingPending > 0) {
    const lendingRatio = lendingPending / availBal;
    lendingScore = lendingRatio >= 0.5 ? 5 : lendingRatio >= 0.25 ? 12 : lendingRatio >= 0.1 ? 20 : 25;
    lendingPct   = (lendingScore / 25) * 100;
  }

  // Factor 4: Expense Trend (0–20 pts)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthExp  = getMonthlyExpenses(lastMonthDate.getMonth(), lastMonthDate.getFullYear());
  const lastMonthTotal = getTotalAmount(lastMonthExp);
  let trendScore = 10;
  let trendPct   = 50;
  if (lastMonthTotal > 0 && monthExpTotal > 0) {
    const change = ((monthExpTotal - lastMonthTotal) / lastMonthTotal) * 100;
    trendScore = change <= -10 ? 20 : change <= 0 ? 17 : change <= 10 ? 13 : change <= 20 ? 8 : 3;
    trendPct   = (trendScore / 20) * 100;
  }

  const totalScore = savingsScore + budgetScore + lendingScore + trendScore;

  // Render ring
  const ring = document.getElementById('healthRingFill');
  if (ring) {
    const circumference = 326.73;
    const offset = circumference - (totalScore / 100) * circumference;
    const ringColor = totalScore >= 75 ? '#1b9e4b' : totalScore >= 50 ? '#e8780a' : '#dc3545';
    ring.style.stroke = ringColor;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
  }

  // Render score number
  const numEl = document.getElementById('healthScoreNum');
  if (numEl) numEl.textContent = totalScore;

  // Render factor bars
  function setFactor(barId, scoreId, pct, score, max) {
    const bar = document.getElementById(barId);
    const scoreEl = document.getElementById(scoreId);
    if (bar) {
      bar.style.width = Math.max(2, pct) + '%';
      bar.style.background = pct >= 70 ? '#1b9e4b' : pct >= 40 ? '#e8780a' : '#dc3545';
    }
    if (scoreEl) scoreEl.textContent = score + '/' + max;
  }
  setFactor('hfSavingsBar',  'hfSavingsScore',  (savingsScore  / 30) * 100, savingsScore,  30);
  setFactor('hfBudgetBar',   'hfBudgetScore',   budgetPct,                   budgetScore,   25);
  setFactor('hfLendingBar',  'hfLendingScore',  lendingPct,                  lendingScore,  25);
  setFactor('hfTrendBar',    'hfTrendScore',    trendPct,                    trendScore,    20);

  // Verdict
  const verdictEl = document.getElementById('healthVerdict');
  if (verdictEl) {
    const verdicts = [
      [80, '&#x1F31F; Excellent! Your finances are in great shape.', 'health-verdict--great'],
      [60, '&#x1F44D; Good! A few areas to watch this month.',       'health-verdict--good'],
      [40, '&#x26A0;&#xFE0F; Fair. Consider reviewing your spending habits.',  'health-verdict--warn'],
      [0,  '&#x1F6A8; Needs attention. Focus on savings and budgets.',          'health-verdict--poor']
    ];
    const [, text, cls] = verdicts.find(([min]) => totalScore >= min) || verdicts[verdicts.length - 1];
    verdictEl.className = 'health-score-verdict ' + cls;
    verdictEl.innerHTML = text;
  }
})();

// ── System Visibility Signals ─────────────────────────────────
(function renderDashSignals() {
  const el = document.getElementById('dashSignals');
  if (!el) return;
  const signals = [];
  const accounts = getAllAccounts();
  const expenses = getAllExpenses();
  const lending = getAllLendings();
  if (accounts.length > 0) signals.push(`Tracking ${accounts.length} account${accounts.length > 1 ? 's' : ''}`);
  if (monthExp.length > 0) signals.push(`${monthExp.length} transaction${monthExp.length > 1 ? 's' : ''} this month`);
  if (lending.filter(l => l.status === 'pending').length > 0) {
    signals.push(`${lending.filter(l => l.status === 'pending').length} pending lending${lending.filter(l => l.status === 'pending').length > 1 ? 's' : ''}`);
  }
  signals.push('Last updated just now');
  el.innerHTML = signals.map(s => `<span class="dash-signal">${s}</span>`).join('');
})();

// ── Spending & Budget Indicators ──────────────────────────────
(function renderDashIndicators() {
  const container = document.getElementById('dashIndicators');
  if (!container) return;
  const indicators = [];

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthExp = getMonthlyExpenses(lastMonth.getMonth(), lastMonth.getFullYear());
  const lastMonthExpTotal = getTotalAmount(lastMonthExp);
  if (lastMonthExpTotal > 0 && monthExpTotal > 0) {
    const pctChange = Math.round(((monthExpTotal - lastMonthExpTotal) / lastMonthExpTotal) * 100);
    const arrow = pctChange > 0 ? '↑' : pctChange < 0 ? '↓' : '→';
    const cls = pctChange > 0 ? 'indicator-up' : pctChange < 0 ? 'indicator-down' : 'indicator-flat';
    indicators.push(`<span class="dash-indicator ${cls}">Spending ${arrow} ${Math.abs(pctChange)}% vs last month</span>`);
  }

  const budgets = getAllBudgets();
  const budgetCats = Object.keys(budgets);
  if (budgetCats.length) {
    let exceeded = 0, near = 0;
    budgetCats.forEach(cat => {
      const limit = budgets[cat];
      const spent = getTotalAmount(monthExp.filter(e => e.category === cat));
      const ratio = spent / limit;
      if (ratio >= 1) exceeded++;
      else if (ratio >= 0.8) near++;
    });
    let statusText = '';
    if (exceeded > 0) statusText = `${exceeded} budget${exceeded > 1 ? 's' : ''} exceeded`;
    else if (near > 0) statusText = `${near} budget${near > 1 ? 's' : ''} near limit`;
    else statusText = 'All budgets within limit';
    const statusCls = exceeded > 0 ? 'indicator-up' : near > 0 ? 'indicator-warn' : 'indicator-down';
    indicators.push(`<span class="dash-indicator ${statusCls}">${statusText}</span>`);
  }

  container.innerHTML = indicators.join('');
})();

// ── Budget Warnings (≥ 80% used) ──────────────────────────────
(function renderBudgetWarnings() {
  const budgets = getAllBudgets();
  const cats    = Object.keys(budgets);
  if (!cats.length) return;

  const warnings = cats.filter(cat => {
    const limit = budgets[cat];
    const spent = getTotalAmount(monthExp.filter(e => e.category === cat));
    return (spent / limit) >= 0.8;
  }).map(cat => {
    const limit = budgets[cat];
    const spent = getTotalAmount(monthExp.filter(e => e.category === cat));
    const pct   = Math.round((spent / limit) * 100);
    const over  = spent >= limit;
    return `<span class="budget-warning-badge ${over ? 'over' : 'warn'}">
      ${over ? '&#x1F534;' : '&#x1F7E1;'} ${cat}: ${pct}% used (${fmt(spent)} / ${fmt(limit)})
    </span>`;
  });

  if (warnings.length) {
    document.getElementById('budgetWarningsSection').style.display = '';
    document.getElementById('budgetWarnings').innerHTML = warnings.join('');
  }
})();

// ── This Month's Insights ─────────────────────────────────────
(function renderInsights() {
  const grid = document.getElementById('insightGrid');
  const catTotals = getCategoryTotals(monthExp);
  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
  const topCat    = sortedCats[0];
  const topCatPct = monthExpTotal > 0 && topCat ? Math.round((catTotals[topCat] / monthExpTotal) * 100) : 0;
  const biggestExp = monthExp.reduce((max, e) => (!max || Number(e.amount) > Number(max.amount) ? e : max), null);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth  = now.getDate();
  const avgDailySpend = dayOfMonth > 0 ? monthExpTotal / dayOfMonth : 0;
  const txnCount = monthExp.length;
  const cards = [];

  if (topCat) {
    cards.push(`<div class="insight-card insight-card--top-category">
      <div class="insight-card-header">
        <div class="insight-icon-lg"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
        <span class="insight-badge badge-blue">Top Category</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${topCat}</div>
        <div class="insight-amount">${fmt(catTotals[topCat])}</div>
      </div>
      <div class="insight-card-footer">
        <div class="insight-progress-bar"><div class="insight-progress-fill fill-blue" style="width:${topCatPct}%"></div></div>
        <span class="insight-pct">${topCatPct}% of total spending</span>
      </div>
    </div>`);
  }

  if (biggestExp) {
    const bigPct = monthExpTotal > 0 ? Math.round((Number(biggestExp.amount) / monthExpTotal) * 100) : 0;
    cards.push(`<div class="insight-card insight-card--biggest">
      <div class="insight-card-header">
        <div class="insight-icon-lg icon-red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div>
        <span class="insight-badge badge-red">Biggest Expense</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${fmt(biggestExp.amount)}</div>
        <div class="insight-meta">
          <span class="insight-chip chip-red">${biggestExp.category}</span>
          <span class="insight-date">${biggestExp.date}</span>
        </div>
      </div>
      <div class="insight-card-footer">
        <div class="insight-progress-bar"><div class="insight-progress-fill fill-red" style="width:${bigPct}%"></div></div>
        <span class="insight-pct">${bigPct}% of total spending</span>
      </div>
    </div>`);
  }

  if (monthExpTotal > 0) {
    const savingsRate = monthIncTotal > 0 ? Math.round((monthlySavings / monthIncTotal) * 100) : 0;
    const rateLabel = savingsRate >= 20 ? 'Good' : savingsRate >= 10 ? 'Average' : 'Low';
    const rateColor = savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'amber' : 'red';
    cards.push(`<div class="insight-card insight-card--savings">
      <div class="insight-card-header">
        <div class="insight-icon-lg icon-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>
        <span class="insight-badge badge-${rateColor}">${rateLabel}</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${savingsRate}%</div>
        <div class="insight-amount">Savings Rate</div>
      </div>
      <div class="insight-card-footer">
        <div class="insight-progress-bar"><div class="insight-progress-fill fill-${rateColor}" style="width:${Math.max(0, Math.min(100, savingsRate))}%"></div></div>
        <span class="insight-pct">${fmt(monthlySavings)} saved this month</span>
      </div>
    </div>`);
  }

  if (monthExpTotal > 0) {
    const projectedTotal = avgDailySpend * daysInMonth;
    cards.push(`<div class="insight-card insight-card--daily">
      <div class="insight-card-header">
        <div class="insight-icon-lg icon-orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg></div>
        <span class="insight-badge badge-orange">${txnCount} transactions</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${fmt(Math.round(avgDailySpend))}</div>
        <div class="insight-amount">Daily Average</div>
      </div>
      <div class="insight-card-footer">
        <span class="insight-pct">Projected: ${fmt(Math.round(projectedTotal))} this month</span>
      </div>
    </div>`);
  }

  // ── Investment Insights ────────────────────────────────────
  const investments = getAllInvestments();
  const fds = getAllFDs();
  const rds = getAllRDs();
    const today = new Date();
  const maturityItems = [];

  fds.forEach(fd => {
    const maturityDate = getFDMaturityDate(fd);
    const daysRemaining = getDaysUntilDate(maturityDate, today);
    if (maturityDate) {
      maturityItems.push({
        label: fd.bankName,
        type: 'FD',
        date: maturityDate,
        daysRemaining
      });
    }
  });

  rds.forEach(rd => {
    const maturityDate = getRDMaturityDate(rd);
    const daysRemaining = getDaysUntilDate(maturityDate, today);
    if (maturityDate) {
      maturityItems.push({
        label: rd.bankName,
        type: 'RD',
        date: maturityDate,
        daysRemaining
      });
    }
  });

  const dueIn7Days = maturityItems.filter(item => item.daysRemaining != null && item.daysRemaining >= 0 && item.daysRemaining <= 7);
  const dueIn30Days = maturityItems.filter(item => item.daysRemaining != null && item.daysRemaining > 7 && item.daysRemaining <= 30);
  const maturedItems = maturityItems.filter(item => item.daysRemaining != null && item.daysRemaining < 0);

  if (maturityItems.length > 0) {
    cards.push(`<div class="insight-card insight-card--investment">
      <div class="insight-card-header">
        <div class="insight-icon-lg" style="color:#dc3545;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7V3"/><path d="M16 7V3"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 11h18"/></svg></div>
        <span class="insight-badge" style="background:#dc354520;color:#dc3545;">Upcoming Maturities</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${dueIn7Days.length + dueIn30Days.length}</div>
        <div class="insight-amount">${dueIn7Days.length} due in 7d • ${dueIn30Days.length} due in 30d</div>
      </div>
      <div class="insight-card-footer">
        <span class="insight-pct">${maturedItems.length} already matured</span>
      </div>
    </div>`);
  }

  // SIP due alerts
  const sipDueItems = investments.filter(inv => isUpcomingSIP(inv, today));
  if (sipDueItems.length > 0) {
    const nextSIPAmount = sipDueItems.reduce((sum, inv) => sum + Number(inv.sipAmount || 0), 0);
    cards.push(`<div class="insight-card insight-card--investment">
      <div class="insight-card-header">
        <div class="insight-icon-lg" style="color:#1a73e8;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 2.5-3.41 2.5-5.5C21.5 6.04 18.96 3.5 16 3.5c-2.05 0-3.88 1.06-4.95 2.65M5 10c0 2.09 1.01 4.04 2.5 5.5M1 11c0 1.49.5 2.88 1.5 4"/></svg></div>
        <span class="insight-badge" style="background:#1a73e820;color:#1a73e8;">Upcoming SIPs</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${sipDueItems.length}</div>
        <div class="insight-amount">Total: ${fmt(nextSIPAmount)} due this month</div>
      </div>
    </div>`);
  }

  // FD maturity insight
    const nextSixty = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const maturingFDs = fds.filter(fd => {
    const matDate = parseStoredDate(getFDMaturityDate(fd));
    return matDate > today && matDate <= nextSixty;
  });

  if (maturingFDs.length > 0) {
    const fdCount = maturingFDs.length;
    cards.push(`<div class="insight-card insight-card--investment">
      <div class="insight-card-header">
        <div class="insight-icon-lg" style="color:#1b9e4b;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11H3v2h6v-2zm6-2c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M15 13H3v8h12v-8z"/></svg></div>
        <span class="insight-badge" style="background:#1b9e4b20;color:#1b9e4b;">FD Maturing Soon</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${fdCount} FD${fdCount > 1 ? 's' : ''}</div>
        <div class="insight-amount">Maturing in next 60 days</div>
      </div>
    </div>`);
  }

  // RD projection insight
  if (rds.length > 0) {
    let totalRDMaturity = 0;
    rds.forEach(rd => {
      totalRDMaturity += calculateRDMaturityValue(rd);
    });
    cards.push(`<div class="insight-card insight-card--investment">
      <div class="insight-card-header">
        <div class="insight-icon-lg" style="color:#e8780a;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2.4"/></svg></div>
        <span class="insight-badge" style="background:#e8780a20;color:#e8780a;">RD Projection</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${fmt(totalRDMaturity)}</div>
        <div class="insight-amount">${rds.length} RD${rds.length > 1 ? 's' : ''} at maturity</div>
      </div>
    </div>`);
  }

  // Portfolio insight
  if (investments.length > 0 || fds.length > 0 || rds.length > 0) {
    const mfValue = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
    const fdValue = fds.reduce((sum, fd) => sum + calculateFDMaturityValue(fd), 0);
    const rdValue = rds.reduce((sum, rd) => sum + calculateRDMaturityValue(rd), 0);
    const totalPortfolio = mfValue + fdValue + rdValue;
    const investmentPct = totalNetWorth > 0 ? (totalPortfolio / totalNetWorth) * 100 : 0;
    const allocationItems = [
      { label: 'Mutual Funds', value: mfValue },
      { label: 'Fixed Deposits', value: fdValue },
      { label: 'Recurring Deposits', value: rdValue }
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    const leadingAllocation = allocationItems[0];

    const performanceItems = [
      ...investments.map(investment => {
        const invested = Number(investment.investedAmount || 0);
        const current = Number(investment.currentValue || 0);
        return {
          label: investment.fundName,
          kind: investment.fundType || 'Mutual Fund',
          current,
          returnPct: invested > 0 ? ((current - invested) / invested) * 100 : 0
        };
      }),
      ...fds.map(fd => {
        const invested = Number(fd.amount || 0);
        const current = calculateFDMaturityValue(fd);
        return {
          label: fd.bankName,
          kind: 'Fixed Deposit',
          current,
          returnPct: invested > 0 ? ((current - invested) / invested) * 100 : 0
        };
      }),
      ...rds.map(rd => {
        const invested = calculateRDTotalInvested(rd);
        const current = calculateRDMaturityValue(rd);
        return {
          label: rd.bankName,
          kind: 'Recurring Deposit',
          current,
          returnPct: invested > 0 ? ((current - invested) / invested) * 100 : 0
        };
      })
    ].filter(item => item.current > 0);

    const bestPerformer = [...performanceItems].sort((a, b) => b.returnPct - a.returnPct)[0];
    const largestHolding = [...performanceItems].sort((a, b) => b.current - a.current)[0];

    cards.push(`<div class="insight-card insight-card--investment">
      <div class="insight-card-header">
        <div class="insight-icon-lg" style="color:#1a73e8;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="12 1 23 8 23 16 12 23 1 16 1 8 12 1"></polyline><polyline points="12 12 23 7 23 16 12 23 1 16 1 7 12 12"></polyline></svg></div>
        <span class="insight-badge" style="background:#1a73e820;color:#1a73e8;">Portfolio</span>
      </div>
      <div class="insight-card-body">
        <div class="insight-value-lg">${fmt(totalPortfolio)}</div>
        <div class="insight-amount">${formatPercentage(investmentPct)} of net worth</div>
      </div>
      <div class="insight-card-footer">
        <div class="insight-progress-bar"><div class="insight-progress-fill fill-blue" style="width:${Math.max(0, Math.min(100, investmentPct))}%"></div></div>
        <span class="insight-pct">${investments.length > 0 ? investments.length + ' MF' : ''}${investments.length > 0 && (fds.length > 0 || rds.length > 0) ? ', ' : ''}${fds.length > 0 ? fds.length + ' FD' : ''}${fds.length > 0 && rds.length > 0 ? ', ' : ''}${rds.length > 0 ? rds.length + ' RD' : ''}</span>
      </div>
    </div>`);

    if (bestPerformer) {
      cards.push(`<div class="insight-card insight-card--investment">
        <div class="insight-card-header">
          <div class="insight-icon-lg" style="color:#1b9e4b;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg></div>
          <span class="insight-badge" style="background:#1b9e4b20;color:#1b9e4b;">Best Performer</span>
        </div>
        <div class="insight-card-body">
          <div class="insight-value-lg">${bestPerformer.label}</div>
          <div class="insight-amount">${bestPerformer.kind} • ${formatSignedPct(bestPerformer.returnPct)}</div>
        </div>
      </div>`);
    }

    if (largestHolding) {
      cards.push(`<div class="insight-card insight-card--investment">
        <div class="insight-card-header">
          <div class="insight-icon-lg" style="color:#e8780a;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <span class="insight-badge" style="background:#e8780a20;color:#e8780a;">Largest Holding</span>
        </div>
        <div class="insight-card-body">
          <div class="insight-value-lg">${fmt(largestHolding.current)}</div>
          <div class="insight-amount">${largestHolding.label} • ${largestHolding.kind}</div>
        </div>
      </div>`);
    }

    if (leadingAllocation) {
      const leadingPct = totalPortfolio > 0 ? (leadingAllocation.value / totalPortfolio) * 100 : 0;
      cards.push(`<div class="insight-card insight-card--investment">
        <div class="insight-card-header">
          <div class="insight-icon-lg" style="color:#6366f1;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21H3"/><path d="M7 16V8"/><path d="M12 16V4"/><path d="M17 16v-5"/></svg></div>
          <span class="insight-badge" style="background:#6366f120;color:#6366f1;">Allocation Insight</span>
        </div>
        <div class="insight-card-body">
          <div class="insight-value-lg">${leadingAllocation.label}</div>
          <div class="insight-amount">${formatPercentage(leadingPct)} of portfolio</div>
        </div>
      </div>`);
    }

    // Historical portfolio growth from snapshots
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
          const cls  = best.val >= 0 ? '#1b9e4b' : '#dc3545';
          const icon = best.val >= 0 ? 'M3 17l6-6 4 4 8-8' : 'M3 7l6 6 4-4 8 8';
          cards.push(`<div class="insight-card insight-card--investment">
            <div class="insight-card-header">
              <div class="insight-icon-lg" style="color:${cls};"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${icon}"/></svg></div>
              <span class="insight-badge" style="background:${cls}20;color:${cls};">Portfolio Growth (${best.label})</span>
            </div>
            <div class="insight-card-body">
              <div class="insight-value-lg" style="color:${cls};">${formatSignedPct(best.val)}</div>
              <div class="insight-amount">Since ${growth.oldestDate}</div>
            </div>
          </div>`);
        }
      }
    }
  }

  grid.innerHTML = cards.length ? cards.join('') : `<div class="empty-state">
    <div class="empty-state-icon">&#x1F4CA;</div>
    <div class="empty-state-title">No expense data this month yet</div>
    <div class="empty-state-desc">Add your first expense to see insights and trends here.</div>
    <div class="empty-state-actions">
      <a class="empty-state-action" href="views/expenses.html">&#x2795; Add Expense</a>
    </div>
  </div>`;
})();

// ── Latest Activity ───────────────────────────────────────────
(function renderLatestActivity() {
  const container = document.getElementById('latestActivity');

  // Use unified transaction model
  const allItems = getAllTransactions().slice(0, 10);
  const totalCount = getAllTransactions().length;
  const hasMore = totalCount > 10;

  if (!allItems.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#x1F4CB;</div>
      <div class="empty-state-title">No transactions recorded yet</div>
      <div class="empty-state-desc">Start adding expenses or income to see your activity here.</div>
      <div class="empty-state-actions">
        <a class="empty-state-action" href="views/expenses.html">&#x2795; Add Expense</a>
        <a class="empty-state-action" href="views/income.html">&#x2795; Add Income</a>
      </div>
    </div>`;
    return;
  }

  let html = '';
  allItems.forEach(item => {
    const isExp = item.type === 'expense';
    const isLend = item.type === 'lending_given' || item.type === 'lending_return';
    const isReturn = item.type === 'lending_return';
    const isIncome = item.type === 'income';
    const icon = isLend ? '&#x1F91D;' : isExp ? '&#x1F6D2;' : '&#x1F4B5;';
    const sign = (isExp || (isLend && !isReturn)) ? '-' : '+';
    const rowClass = (isExp || (isLend && !isReturn)) ? 'expense-row' : 'income-row';
    const typeLabel = item.type === 'lending_given' ? 'Lending' : item.type === 'lending_return' ? 'Return' : isExp ? 'Expense' : 'Income';
    const accName = item.accountId ? getAccountName(item.accountId) : '';
    const accHtml = accName && accName !== '—' ? `<span class="activity-account">${accName}</span>` : '';
    const displayDate = formatActivityDate(item.date, item.createdAt);
    const recurringHtml = item.recurringId ? '<span class="activity-recurring-badge">Recurring</span>' : '';

    html += `<div class="activity-row ${rowClass}">
      <div class="today-icon-wrap">${icon}</div>
      <div class="activity-detail">
        <div class="activity-cat">${item.category}${recurringHtml}</div>
        <div class="activity-meta">
          <span class="activity-type-badge ${item.type}">${typeLabel}</span>
          ${accHtml}
          <span class="activity-date">${displayDate}</span>
        </div>
      </div>
      <span class="today-amount">${sign} ${fmt(item.amount)}</span>
    </div>`;
  });

  if (hasMore) {
    html += `<a href="views/expenses.html" class="view-all-link">View All Transactions &rarr;</a>`;
  }

  container.innerHTML = html;
})();

// ── Recurring Added Today ─────────────────────────────────────
(function renderRecurringToday() {
  let fired = [];
  try { fired = JSON.parse(localStorage.getItem('recurringFiredToday')) || []; } catch {}
  if (!fired.length) return;

  document.getElementById('recurringTodaySection').style.display = '';
  document.getElementById('recurringToday').innerHTML = fired.map(f =>
    `<span class="recurring-today-badge ${f.type}">${f.label}: ${fmt(f.amount)} added</span>`
  ).join('');
})();

// ── Last Updated Indicator ────────────────────────────────────
(function renderLastUpdated() {
  const container = document.querySelector('.container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'last-updated';
  const now = new Date();
  el.textContent = 'Last updated: ' + now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  container.appendChild(el);
})();
