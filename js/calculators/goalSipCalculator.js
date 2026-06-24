/* Goal-Based SIP Calculator UI */
(function () {
  let chart = null;
  function $(id) { return document.getElementById(id); }

  function render() {
    const goal = parseFloat($('goalAmount').value) || 0;
    const years = parseFloat($('goalYears').value) || 0;
    const rate = parseFloat($('goalRate').value) || 0;

    const res = calculateGoalSIP(goal, years, rate);

    $('goalSIPRequired').textContent = calcFmt(res.monthlySIP);
    $('goalInvested').textContent = calcFmt(res.invested);
    $('goalReturns').textContent = calcFmt(res.returns);
    $('goalTarget').textContent = calcFmt(res.goal);

    $('goalYearsLabel').textContent = years + (years === 1 ? ' yr' : ' yrs');
    $('goalRateLabel').textContent = formatPercentage(rate);

    const insight = $('goalInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (txt && goal > 0 && years > 0) {
        txt.innerHTML =
          'You need approximately <strong>' + calcFmt(res.monthlySIP) +
          '/month</strong> to reach <strong>' + calcFmtShort(goal) +
          '</strong> in <strong>' + years + (years === 1 ? ' year' : ' years') +
          '</strong> at <strong>' + formatPercentage(rate) + '</strong> returns.';
      }
    }

    ['goalAmountSlider', 'goalYearsSlider', 'goalRateSlider'].forEach(updateRangeFill);

    drawChart(res);
  }

  function drawChart(res) {
    const canvas = $('goalChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    const invested = Math.max(0, Math.round(res.invested));
    const returns = Math.max(0, Math.round(res.returns));
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Your Investment', 'Estimated Returns'],
        datasets: [{
          data: [invested, returns],
          backgroundColor: ['#1a73e8', '#1b9e4b'],
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

  function init() {
    if (!$('goalAmount')) return;
    syncSlider('goalAmount', 'goalAmountSlider', render);
    syncSlider('goalYears', 'goalYearsSlider', render);
    syncSlider('goalRate', 'goalRateSlider', render);
    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'goal') render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
