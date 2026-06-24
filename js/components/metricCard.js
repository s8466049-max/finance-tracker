// ════════════════════════════════════════════════════════════════
//  Component: MetricCard — Reusable KPI card
//  Usage: MetricCard.render({ label, value, delta, deltaType, target })
//         or MetricCard.html({ ... })  → returns HTML string
// ════════════════════════════════════════════════════════════════

const MetricCard = (function () {
  function html(opts) {
    const o = opts || {};
    const label     = o.label || '';
    const value     = (o.value !== undefined && o.value !== null) ? o.value : '—';
    const delta     = o.delta || '';
    const deltaType = o.deltaType || 'neutral'; // positive | negative | neutral
    const action    = o.actionHref
      ? `<a class="card-action" href="${o.actionHref}">${o.actionLabel || 'View'} &rarr;</a>`
      : '';
    const deltaHtml = delta
      ? `<div class="c-metric-card__delta is-${deltaType}">${delta}</div>`
      : '';
    return `<div class="c-metric-card">
      <div class="c-metric-card__label">${label}</div>
      <div class="c-metric-card__value">${value}</div>
      ${deltaHtml}
      ${action}
    </div>`;
  }

  function render(opts) {
    const target = opts && opts.target ? document.querySelector(opts.target) : null;
    if (!target) return;
    target.innerHTML = html(opts);
  }

  return { html, render };
})();
