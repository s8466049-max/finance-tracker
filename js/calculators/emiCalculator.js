/* EMI Calculator UI */
(function () {
  let chartPie = null;
  let chartBar = null;
  function $(id) { return document.getElementById(id); }

  function render() {
    const loan = parseFloat($('emiLoan').value) || 0;
    const rate = parseFloat($('emiRate').value) || 0;
    const years = parseFloat($('emiYears').value) || 0;

    const res = calculateEMI(loan, rate, years);

    $('emiAmount').textContent = calcFmt(res.emi);
    $('emiPrincipal').textContent = calcFmt(res.principal);
    $('emiInterest').textContent = calcFmt(res.totalInterest);
    $('emiTotal').textContent = calcFmt(res.totalRepayment);

    $('emiRateLabel').textContent = formatPercentage(rate);
    $('emiYearsLabel').textContent = years + (years === 1 ? ' yr' : ' yrs');

    const insight = $('emiInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (txt && loan > 0 && years > 0) {
        const pct = res.totalRepayment > 0
          ? formatPercentage((res.totalInterest / res.totalRepayment) * 100)
          : formatPercentage(0);
        txt.innerHTML =
          'On a <strong>' + calcFmtShort(loan) + '</strong> loan over <strong>' +
          years + (years === 1 ? ' year' : ' years') + '</strong>, you will pay <strong>' +
          calcFmtShort(res.totalInterest) + '</strong> in interest — that is <strong>' +
          pct + '</strong> of your total payment.';
      }
    }

    ['emiLoanSlider', 'emiRateSlider', 'emiYearsSlider'].forEach(updateRangeFill);

    drawPie(res);
    drawBar(res.schedule);
  }

  function drawPie(res) {
    const canvas = $('emiChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chartPie) chartPie.destroy();
    chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [{
          data: [Math.round(res.principal), Math.round(res.totalInterest)],
          backgroundColor: ['#1a73e8', '#dc3545'],
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

  function drawBar(schedule) {
    const canvas = $('emiBarChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: schedule.map(s => 'Y' + s.year),
        datasets: [
          {
            label: 'Principal',
            data: schedule.map(s => Math.round(s.principal)),
            backgroundColor: '#1a73e8',
            borderRadius: 4
          },
          {
            label: 'Interest',
            data: schedule.map(s => Math.round(s.interest)),
            backgroundColor: '#dc3545',
            borderRadius: 4
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
          y: { stacked: true, grid: CalcChart.yGrid(), ticks: { ...CalcChart.ticks(), callback: v => calcFmtShort(v) } }
        }
      }
    });
  }

  function init() {
    if (!$('emiLoan')) return;
    syncSlider('emiLoan', 'emiLoanSlider', render);
    syncSlider('emiRate', 'emiRateSlider', render);
    syncSlider('emiYears', 'emiYearsSlider', render);
    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'emi') render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
