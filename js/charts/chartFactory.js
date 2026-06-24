// ════════════════════════════════════════════════════════════════
//  Chart Factory — Reusable Chart.js configurations
//  Centralizes default styling, color palette, and dark-mode awareness.
//  Requires: Chart.js (UMD) loaded before this file.
// ════════════════════════════════════════════════════════════════

const ChartFactory = (function () {
  const PALETTE = [
    '#1a73e8', '#1b9e4b', '#e8780a', '#dc3545', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#10b981'
  ];

  function isDark() {
    return document.body.classList.contains('dark');
  }

  function tokenColors() {
    const dark = isDark();
    return {
      text:       dark ? '#e2e4e9' : '#1a1a2e',
      textMuted:  dark ? '#a0a6b4' : '#8c93a4',
      grid:       dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      gridStrong: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      tooltipBg:  dark ? '#1a1d27' : '#ffffff',
      tooltipBorder: dark ? '#2e323e' : '#e2e6ef'
    };
  }

  function baseOptions(extra) {
    const c = tokenColors();
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: c.text,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            usePointStyle: true,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: c.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: "'Inter', sans-serif", weight: '600' },
          bodyFont:  { family: "'Inter', sans-serif" }
        }
      },
      scales: {
        x: {
          ticks: { color: c.textMuted, font: { family: "'Inter', sans-serif", size: 11 } },
          grid:  { color: c.grid, drawBorder: false }
        },
        y: {
          ticks: { color: c.textMuted, font: { family: "'Inter', sans-serif", size: 11 } },
          grid:  { color: c.grid, drawBorder: false },
          beginAtZero: true
        }
      }
    };
    return deepMerge(opts, extra || {});
  }

  function deepMerge(a, b) {
    const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    Object.keys(b).forEach(k => {
      const av = out[k], bv = b[k];
      if (av && bv && typeof av === 'object' && typeof bv === 'object' && !Array.isArray(bv)) {
        out[k] = deepMerge(av, bv);
      } else {
        out[k] = bv;
      }
    });
    return out;
  }

  function createLineChart(canvas, data, options) {
    const opts = baseOptions(options);
    const datasets = (data.datasets || []).map((ds, i) => Object.assign({
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      borderWidth: 2,
      tension: 0.32,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true
    }, ds));
    return new Chart(canvas, {
      type: 'line',
      data: { labels: data.labels, datasets: datasets },
      options: opts
    });
  }

  function createBarChart(canvas, data, options) {
    const opts = baseOptions(options);
    const datasets = (data.datasets || []).map((ds, i) => Object.assign({
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 36
    }, ds));
    return new Chart(canvas, {
      type: 'bar',
      data: { labels: data.labels, datasets: datasets },
      options: opts
    });
  }

  function createDoughnutChart(canvas, data, options) {
    const c = tokenColors();
    const merged = deepMerge({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: c.text,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            usePointStyle: true,
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: c.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      }
    }, options || {});
    const datasets = (data.datasets || []).map(ds => Object.assign({
      backgroundColor: PALETTE,
      borderColor: c.tooltipBg,
      borderWidth: 2
    }, ds));
    return new Chart(canvas, {
      type: 'doughnut',
      data: { labels: data.labels, datasets: datasets },
      options: merged
    });
  }

  return {
    palette: PALETTE,
    createLineChart,
    createBarChart,
    createDoughnutChart
  };
})();
