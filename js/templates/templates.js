// ════════════════════════════════════════════════════════════════
//  Templates — Reusable HTML string builders
//  Pure functions: take data, return HTML string. No DOM access.
//  Usage: container.innerHTML = Templates.metricCard({...});
// ════════════════════════════════════════════════════════════════

const Templates = (function () {

  // ── Internal helpers ─────────────────────────────────────────
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function cls(arr) {
    return (Array.isArray(arr) ? arr : [arr]).filter(Boolean).join(' ');
  }
  function fmtMoney(n) {
    if (typeof window !== 'undefined' && typeof window.formatCurrency === 'function') {
      return window.formatCurrency(n);
    }
    const num = Number(n) || 0;
    return '\u20B9' + num.toLocaleString('en-IN');
  }

  // ── createMetricCard ─────────────────────────────────────────
  // { label, value, delta, deltaType, icon, actionHref, actionLabel }
  function metricCard(o) {
    o = o || {};
    const deltaHtml = o.delta
      ? `<div class="c-metric-card__delta is-${esc(o.deltaType || 'neutral')}">${esc(o.delta)}</div>`
      : '';
    const iconHtml = o.icon ? `<div class="c-metric-card__icon">${o.icon}</div>` : '';
    const action = o.actionHref
      ? `<a class="card-action" href="${esc(o.actionHref)}">${esc(o.actionLabel || 'View')} &rarr;</a>`
      : '';
    return `<div class="${cls(['c-metric-card', o.className])}">
      ${iconHtml}
      <div class="c-metric-card__label">${esc(o.label)}</div>
      <div class="c-metric-card__value count-up">${o.valueHtml || esc(o.value)}</div>
      ${deltaHtml}
      ${action}
    </div>`;
  }

  // ── createInsightCard ────────────────────────────────────────
  // { title, value, subtitle, tone: 'positive'|'negative'|'warning'|'info', icon }
  function insightCard(o) {
    o = o || {};
    const tone = esc(o.tone || 'info');
    const sub = o.subtitle ? `<div class="insight-card__sub">${esc(o.subtitle)}</div>` : '';
    return `<div class="insight-card insight-card--${tone}">
      ${o.icon ? `<div class="insight-card__icon">${o.icon}</div>` : ''}
      <div class="insight-card__title">${esc(o.title)}</div>
      <div class="insight-card__value">${o.valueHtml || esc(o.value)}</div>
      ${sub}
    </div>`;
  }

  // ── createTableRow ───────────────────────────────────────────
  // cells: [{ value, label, className, html }]
  function tableRow(cells, opts) {
    opts = opts || {};
    const td = (cells || []).map(c => {
      const dataLabel = c.label ? ` data-label="${esc(c.label)}"` : '';
      const cn = c.className ? ` class="${esc(c.className)}"` : '';
      const content = c.html != null ? c.html : esc(c.value);
      return `<td${dataLabel}${cn}>${content}</td>`;
    }).join('');
    const trAttrs = opts.id ? ` data-id="${esc(opts.id)}"` : '';
    return `<tr${trAttrs}>${td}</tr>`;
  }

  // ── createTable ──────────────────────────────────────────────
  // { headers: [...], rows: [[{value,label}, ...], ...], responsive }
  function table(o) {
    o = o || {};
    const klass = cls(['ft-table', o.responsive ? 'responsive-table' : '', o.className]);
    const thead = (o.headers || []).map(h =>
      `<th>${esc(typeof h === 'string' ? h : h.label)}</th>`
    ).join('');
    const tbody = (o.rows || []).map(cells => tableRow(cells)).join('');
    return `<table class="${klass}">
      ${o.headers ? `<thead><tr>${thead}</tr></thead>` : ''}
      <tbody>${tbody}</tbody>
    </table>`;
  }

  // ── createActivityItem ──────────────────────────────────────
  // { title, description, amount, amountType: 'in'|'out', date, icon }
  function activityItem(o) {
    o = o || {};
    const sign = o.amountType === 'in' ? '+' : (o.amountType === 'out' ? '-' : '');
    const cn = o.amountType === 'in' ? 'is-positive'
             : o.amountType === 'out' ? 'is-negative' : '';
    return `<div class="activity-item">
      ${o.icon ? `<div class="activity-item__icon">${o.icon}</div>` : ''}
      <div class="activity-item__body">
        <div class="activity-item__title">${esc(o.title)}</div>
        ${o.description ? `<div class="activity-item__sub">${esc(o.description)}</div>` : ''}
      </div>
      <div class="activity-item__meta">
        ${o.amount != null ? `<div class="activity-item__amount ${cn}">${esc(sign)}${fmtMoney(o.amount)}</div>` : ''}
        ${o.date ? `<div class="activity-item__date">${esc(o.date)}</div>` : ''}
      </div>
    </div>`;
  }

  // ── createEmptyState ─────────────────────────────────────────
  function emptyState(o) {
    o = o || {};
    return `<div class="c-empty-state">
      ${o.icon ? `<div class="c-empty-state__icon">${o.icon}</div>` : ''}
      <div class="c-empty-state__title">${esc(o.title || 'No data yet')}</div>
      ${o.message ? `<div class="c-empty-state__msg">${esc(o.message)}</div>` : ''}
      ${o.ctaHref ? `<a class="btn primary c-empty-state__cta" href="${esc(o.ctaHref)}">${esc(o.ctaLabel || 'Get started')}</a>` : ''}
    </div>`;
  }

  // ── createBadge / pill ──────────────────────────────────────
  function badge(o) {
    o = o || {};
    return `<span class="pill pill--${esc(o.tone || 'neutral')}">${esc(o.label)}</span>`;
  }

  // ── Skeleton placeholder ────────────────────────────────────
  function skeleton(opts) {
    opts = opts || {};
    const h = opts.height || 14;
    const w = opts.width || '100%';
    return `<div class="skeleton" style="height:${h}px;width:${typeof w === 'number' ? w + 'px' : w};"></div>`;
  }

  return {
    metricCard,
    insightCard,
    tableRow,
    table,
    activityItem,
    emptyState,
    badge,
    skeleton,
    _esc: esc
  };
})();

if (typeof window !== 'undefined') window.Templates = Templates;
