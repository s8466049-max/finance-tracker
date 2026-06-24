/* Lump Sum Calculator UI */
(function () {
  let chart = null;

  function $(id) { return document.getElementById(id); }

  function render() {
    const amount = parseFloat($('lumpAmount').value) || 0;
    const rate   = parseFloat($('lumpRate').value)   || 0;
    const years  = parseFloat($('lumpYears').value)  || 0;

    const res = calculateLumpSum(amount, rate, years);

    $('lumpInvested').textContent = calcFmt(res.invested);
    $('lumpReturns').textContent  = calcFmt(res.returns);
    $('lumpFuture').textContent   = calcFmt(res.futureValue);

    $('lumpRateLabel').textContent  = formatPercentage(rate);
    $('lumpYearsLabel').textContent = years + (years === 1 ? ' yr' : ' yrs');

    const insight = $('lumpInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (txt && amount > 0 && years > 0) {
        const multiple = amount > 0 ? (res.futureValue / amount).toFixed(2) : '0';
        txt.innerHTML =
          'Your <strong>' + calcFmtShort(amount) + '</strong> lump sum could grow to <strong>' +
          calcFmtShort(res.futureValue) + '</strong> in <strong>' + years +
          (years === 1 ? ' year' : ' years') + '</strong> at <strong>' + formatPercentage(rate) +
          '</strong> — that is <strong>' + multiple + 'x</strong> your investment.';
      }
    }

    ['lumpAmountSlider', 'lumpRateSlider', 'lumpYearsSlider'].forEach(updateRangeFill);

    drawChart(res.schedule);
  }

  function drawChart(schedule) {
    const canvas = $('lumpChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    const grad1 = CalcChart.hexGradient(ctx, '#1a73e8', 320);
    const grad2 = CalcChart.hexGradient(ctx, '#1b9e4b', 320);
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
    if (!$('lumpAmount')) return;
    syncSlider('lumpAmount', 'lumpAmountSlider', render);
    syncSlider('lumpRate',   'lumpRateSlider',   render);
    syncSlider('lumpYears',  'lumpYearsSlider',  render);
    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'lump') render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
