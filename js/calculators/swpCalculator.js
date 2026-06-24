/* SWP Calculator UI */
(function () {
  let chart = null;
  function $(id) { return document.getElementById(id); }

  function render() {
    const corpus = parseFloat($('swpCorpus').value) || 0;
    const withdraw = parseFloat($('swpWithdrawal').value) || 0;
    const rate = parseFloat($('swpRate').value) || 0;
    const years = parseFloat($('swpYears').value) || 0;

    const res = calculateSWP(corpus, withdraw, rate, years);

    $('swpRemaining').textContent = calcFmt(res.remaining);
    $('swpTotalWithdrawn').textContent = calcFmt(res.totalWithdrawn);

    let lastsText;
    if (res.lasts === Infinity) {
      lastsText = '\u267E Sustainable';
    } else if (res.lasts && isFinite(res.lasts)) {
      const yrs = Math.floor(res.lasts / 12);
      const mo = Math.round(res.lasts % 12);
      lastsText = yrs + 'y ' + mo + 'm';
    } else {
      lastsText = years + 'y +';
    }
    $('swpLasts').textContent = lastsText;

    $('swpRateLabel').textContent = formatPercentage(rate);
    $('swpYearsLabel').textContent = years + (years === 1 ? ' yr' : ' yrs');

    const insight = $('swpInsight');
    if (insight) {
      const txt = insight.querySelector('.calc-insight-text');
      if (txt && corpus > 0 && withdraw > 0) {
        if (res.lasts === Infinity) {
          txt.innerHTML =
            'Your <strong>' + calcFmtShort(corpus) + '</strong> corpus can sustain <strong>' +
            calcFmt(withdraw) + '/month</strong> withdrawals indefinitely at <strong>' +
            formatPercentage(rate) + '</strong> returns.';
        } else if (res.exhaustionMonth) {
          const yrs = Math.floor(res.exhaustionMonth / 12);
          const mo = res.exhaustionMonth % 12;
          txt.innerHTML =
            'Withdrawing <strong>' + calcFmt(withdraw) + '/month</strong> will exhaust your <strong>' +
            calcFmtShort(corpus) + '</strong> corpus in <strong>' + yrs + 'y ' + mo + 'm</strong>.';
        } else {
          txt.innerHTML =
            'After <strong>' + years + (years === 1 ? ' year' : ' years') +
            '</strong>, your corpus would still hold <strong>' + calcFmtShort(res.remaining) +
            '</strong>.';
        }
      }
    }

    ['swpCorpusSlider', 'swpWithdrawalSlider', 'swpRateSlider', 'swpYearsSlider'].forEach(updateRangeFill);

    drawChart(res.schedule, corpus);
  }

  function drawChart(schedule, corpus) {
    const canvas = $('swpChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    const grad1 = ctx.createLinearGradient(0, 0, 0, 280);
    grad1.addColorStop(0, 'rgba(26,115,232,0.30)');
    grad1.addColorStop(1, 'rgba(26,115,232,0.02)');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: schedule.map(s => 'Y' + s.year),
        datasets: [
          {
            label: 'Remaining Corpus',
            data: schedule.map(s => Math.round(s.balance)),
            borderColor: '#1a73e8',
            backgroundColor: grad1,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Total Withdrawn',
            data: schedule.map(s => Math.round(s.withdrawnSoFar)),
            borderColor: '#e8780a',
            backgroundColor: 'rgba(232,120,10,0.06)',
            fill: false,
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
          y: { grid: CalcChart.yGrid(), ticks: { ...CalcChart.ticks(), callback: v => calcFmtShort(v) } }
        }
      }
    });
  }

  function init() {
    if (!$('swpCorpus')) return;
    syncSlider('swpCorpus', 'swpCorpusSlider', render);
    syncSlider('swpWithdrawal', 'swpWithdrawalSlider', render);
    syncSlider('swpRate', 'swpRateSlider', render);
    syncSlider('swpYears', 'swpYearsSlider', render);
    window.addEventListener('calc:activated', e => {
      if (e.detail && e.detail.target === 'swp') render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
