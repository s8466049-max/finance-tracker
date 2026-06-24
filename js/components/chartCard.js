// ════════════════════════════════════════════════════════════════
//  Component: ChartCard — Reusable chart container
//  Usage: ChartCard.html({ id, title, subtitle, height })
//         The canvas element will have id="${id}" — pass that to chart factory.
// ════════════════════════════════════════════════════════════════

const ChartCard = (function () {
  function html(opts) {
    const o = opts || {};
    const id        = o.id       || ('chart_' + Math.random().toString(36).slice(2, 9));
    const title     = o.title    || '';
    const subtitle  = o.subtitle ? `<span class="c-chart-card__subtitle">${o.subtitle}</span>` : '';
    const height    = o.height   || 260;
    return `<div class="c-chart-card">
      <div class="c-chart-card__header">
        <span class="c-chart-card__title">${title}</span>
        ${subtitle}
      </div>
      <div class="c-chart-card__canvas-wrap" style="height:${height}px;">
        <canvas id="${id}"></canvas>
      </div>
    </div>`;
  }

  function render(opts) {
    const target = opts && opts.target ? document.querySelector(opts.target) : null;
    if (!target) return null;
    target.innerHTML = html(opts);
    return target.querySelector('canvas');
  }

  return { html, render };
})();
