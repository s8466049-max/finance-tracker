/* SIP Calculator UI */
(function () {
  let chart = null;

  function $(id) { return document.getElementById(id); }

  function render() {
    const monthly = parseFloat($('sipMonthly').value) || 0;
    const rate = parseFloat($('sipRate').value) || 0;
    const years = parseFloat($('sipYears').value) || 0;

    const res = calculateSIP(monthly, rate, years);

    $('sipInvested').textContent = calcFmt(res.invested);
    $('sipReturns').textContent = calcFmt(res.returns);
    $('sipMaturity').textContent = calcFmt(res.maturity);

    $('sipRateLabel').textContent = formatPercentage(rate);
    $('sipYearsLabel').textContent = years + (years === 1 ? ' yr' : ' yrs');

    const insight = $('sipInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (txt && monthly > 0 && years > 0) {
        txt.innerHTML =
          'At <strong>' + formatPercentage(rate) + '</strong> annual return, your <strong>' +
          calcFmt(monthly) + '</strong> monthly SIP could grow to <strong>' +
          calcFmtShort(res.maturity) + '</strong> in <strong>' + years +
          (years === 1 ? ' year' : ' years') + '</strong>.';
      }
    }

    ['sipMonthlySlider', 'sipRateSlider', 'sipYearsSlider'].forEach(updateRangeFill);

    drawChart(res.schedule);
  }

  function drawChart(schedule) {
    const canvas = $('sipChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    const grad1 = ctx.createLinearGradient(0, 0, 0, 280);
    grad1.addColorStop(0, 'rgba(26,115,232,0.30)');
    grad1.addColorStop(1, 'rgba(26,115,232,0.02)');
    const grad2 = ctx.createLinearGradient(0, 0, 0, 280);
    grad2.addColorStop(0, 'rgba(27,158,75,0.32)');
    grad2.addColorStop(1, 'rgba(27,158,75,0.02)');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: schedule.map(s => 'Y' + s.year),
        datasets: [
          {
            label: 'Invested',
            data: schedule.map(s => Math.round(s.invested)),
            borderColor: '#1a73e8',
            backgroundColor: grad1,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Projected Value',
            data: schedule.map(s => Math.round(s.value)),
            borderColor: '#1b9e4b',
            backgroundColor: grad2,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: CalcChart.animation,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: CalcChart.tooltip(c => c.dataset.label + ': ' + calcFmt(c.parsed.y))
        },
        scales: {
          x: { grid: { display: false }, ticks: CalcChart.ticks() },
          y: {
            grid: CalcChart.yGrid(),
            ticks: { ...CalcChart.ticks(), callback: v => calcFmtShort(v) }
          }
        }
      }
    });
  }

  function init() {
    if (!$('sipMonthly')) return;
    syncSlider('sipMonthly', 'sipMonthlySlider', render);
    syncSlider('sipRate', 'sipRateSlider', render);
    syncSlider('sipYears', 'sipYearsSlider', render);
    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'sip') render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
