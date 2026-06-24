/* Income Tax Calculator UI (FY 2025-26) */
(function () {
  let breakdownChart = null;
  let compareChart = null;
  let activeRegime = 'new';

  function $(id) { return document.getElementById(id); }
  function val(id) { return parseFloat(($(id) || {}).value) || 0; }

  function readInputs() {
    return {
      salary: val('taxSalary'),
      bonus:  val('taxBonus'),
      other:  val('taxOther'),
      d80C:   val('tax80C'),
      d80D:   val('tax80D'),
      dHRA:   val('taxHRA'),
      dHome:  val('taxHome'),
      dNPS:   val('taxNPS')
    };
  }

  function render() {
    const input = readInputs();
    const res = calculateIncomeTax(input);
    const r = res[activeRegime];

    // Hero metrics
    $('taxPayable').textContent  = calcFmt(r.totalTax);
    $('taxEffRate').textContent  = formatPercentage(r.effectiveRate);
    $('taxMonthly').textContent  = calcFmt(r.totalTax / 12);
    $('taxTakehome').textContent = calcFmt(r.takeHome);
    $('taxRegimeBadge').textContent = activeRegime === 'new' ? 'New Regime' : 'Old Regime';

    // Comparison cards
    $('taxCompareNewValue').textContent   = calcFmt(res.new.totalTax);
    $('taxCompareOldValue').textContent   = calcFmt(res.old.totalTax);
    $('taxCompareNewTaxable').textContent = calcFmtShort(res.new.taxable);
    $('taxCompareOldTaxable').textContent = calcFmtShort(res.old.taxable);
    $('taxCompareNewRate').textContent    = formatPercentage(res.new.effectiveRate);
    $('taxCompareOldRate').textContent    = formatPercentage(res.old.effectiveRate);

    const newCard = $('taxCompareNew');
    const oldCard = $('taxCompareOld');
    newCard.classList.toggle('is-best', res.better === 'new' && res.savings > 0);
    oldCard.classList.toggle('is-best', res.better === 'old' && res.savings > 0);
    newCard.querySelector('.calc-compare-badge').hidden = !(res.better === 'new' && res.savings > 0);
    oldCard.querySelector('.calc-compare-badge').hidden = !(res.better === 'old' && res.savings > 0);

    newCard.classList.toggle('is-active', activeRegime === 'new');
    oldCard.classList.toggle('is-active', activeRegime === 'old');

    // Deductions tag
    const dedTotal = res.old.deductions;
    $('taxDedTotal').textContent = calcFmtShort(dedTotal);

    // Insight
    const insight = $('taxInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (res.grossIncome <= 0) {
        txt.textContent = 'Enter your income to see how each regime stacks up.';
      } else if (res.savings === 0) {
        txt.innerHTML = 'Both regimes result in the same tax of <strong>' +
          calcFmtShort(res.new.totalTax) + '</strong>. Either works for you.';
      } else {
        const better = res.better === 'old' ? 'Old' : 'New';
        const otherR = res.better === 'old' ? res.new : res.old;
        const bestR  = res.better === 'old' ? res.old : res.new;
        if (res.better === 'old' && res.old.deductions <= (res.old.breakup.stdDed || 0) + 50000) {
          txt.innerHTML = 'Your deductions are limited — Old Regime saves only <strong>' +
            calcFmtShort(res.savings) + '</strong>. Adding more 80C / 80D / NPS could widen the gap.';
        } else {
          txt.innerHTML = 'You may save <strong>' + calcFmtShort(res.savings) +
            '</strong> under the <strong>' + better + ' Regime</strong> (₹' +
            Math.round(bestR.totalTax).toLocaleString('en-IN') + ' vs ₹' +
            Math.round(otherR.totalTax).toLocaleString('en-IN') + ').';
        }
      }
    }

    // Sliders fill
    ['taxSalarySlider', 'taxBonusSlider', 'taxOtherSlider'].forEach(updateRangeFill);

    // Show / hide deductions panel based on regime
    const dedSection = $('taxDeductions');
    if (dedSection) dedSection.style.display = activeRegime === 'old' ? '' : 'none';

    drawBreakdown(r, res.grossIncome);
    drawCompare(res);
  }

  function drawBreakdown(r, gross) {
    const canvas = $('taxBreakdownChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (breakdownChart) breakdownChart.destroy();
    const tax = Math.max(0, Math.round(r.totalTax));
    const ded = Math.max(0, Math.round(r.deductions));
    const takeHome = Math.max(0, Math.round(gross - tax - ded));
    breakdownChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Take-home', 'Deductions', 'Tax'],
        datasets: [{
          data: [takeHome, ded, tax],
          backgroundColor: ['#1b9e4b', '#1a73e8', '#dc3545'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: CalcChart.animation,
        plugins: {
          legend: { display: false },
          tooltip: CalcChart.tooltip(c => c.label + ': ' + calcFmt(c.parsed))
        },
        cutout: '70%'
      }
    });
  }

  function drawCompare(res) {
    const canvas = $('taxCompareChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (compareChart) compareChart.destroy();
    compareChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['New Regime', 'Old Regime'],
        datasets: [
          {
            label: 'Tax',
            data: [Math.round(res.new.totalTax), Math.round(res.old.totalTax)],
            backgroundColor: ['#dc3545', '#dc3545'],
            borderRadius: 6,
            stack: 'a'
          },
          {
            label: 'Take-home',
            data: [
              Math.round(res.grossIncome - res.new.totalTax),
              Math.round(res.grossIncome - res.old.totalTax)
            ],
            backgroundColor: ['#1b9e4b', '#1b9e4b'],
            borderRadius: 6,
            stack: 'a'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: CalcChart.animation,
        plugins: {
          legend: { display: false },
          tooltip: CalcChart.tooltip(c => c.dataset.label + ': ' + calcFmt(c.parsed.y))
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: CalcChart.ticks() },
          y: {
            stacked: true,
            grid: CalcChart.yGrid(),
            ticks: { ...CalcChart.ticks(), callback: v => calcFmtShort(v) }
          }
        }
      }
    });
  }

  function bindSegmented() {
    document.querySelectorAll('.calc-segment[data-regime]').forEach(btn => {
      btn.addEventListener('click', () => {
        const regime = btn.dataset.regime;
        if (regime === activeRegime) return;
        activeRegime = regime;
        document.querySelectorAll('.calc-segment').forEach(b => {
          const isActive = b.dataset.regime === activeRegime;
          b.classList.toggle('is-active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        render();
      });
    });
  }

  function bindCollapsible() {
    const head = document.querySelector('#taxDeductions .calc-collapse-head');
    const body = $('taxDeductionsBody');
    if (!head || !body) return;
    head.addEventListener('click', () => {
      const expanded = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      body.hidden = expanded;
    });
  }

  function bindCompareCardClicks() {
    document.querySelectorAll('.calc-compare-card').forEach(card => {
      card.addEventListener('click', () => {
        const regime = card.id === 'taxCompareOld' ? 'old' : 'new';
        if (regime === activeRegime) return;
        const btn = document.querySelector('.calc-segment[data-regime="' + regime + '"]');
        if (btn) btn.click();
      });
    });
  }

  function init() {
    if (!$('taxSalary')) return;

    [
      ['taxSalary', 'taxSalarySlider'],
      ['taxBonus',  'taxBonusSlider'],
      ['taxOther',  'taxOtherSlider']
    ].forEach(([n, s]) => syncSlider(n, s, render));

    ['tax80C', 'tax80D', 'taxHRA', 'taxHome', 'taxNPS'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', render);
    });

    bindSegmented();
    bindCollapsible();
    bindCompareCardClicks();

    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'tax') render();
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
