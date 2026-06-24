// ════════════════════════════════════════════════════════════════
//  Component: EmptyState — Reusable empty-state block
//  Usage: EmptyState.html({ icon, title, message, ctaLabel, ctaHref })
// ════════════════════════════════════════════════════════════════

const EmptyState = (function () {
  function html(opts) {
    const o = opts || {};
    const icon    = o.icon    || '📭';
    const title   = o.title   || 'Nothing here yet';
    const message = o.message || '';
    const cta = (o.ctaLabel && o.ctaHref)
      ? `<a class="c-empty-state__cta" href="${o.ctaHref}">${o.ctaLabel}</a>`
      : (o.ctaLabel && o.ctaOnClick)
        ? `<button class="c-empty-state__cta" onclick="${o.ctaOnClick}">${o.ctaLabel}</button>`
        : '';
    return `<div class="c-empty-state" role="status">
      <div class="c-empty-state__icon" aria-hidden="true">${icon}</div>
      <div class="c-empty-state__title">${title}</div>
      ${message ? `<div class="c-empty-state__message">${message}</div>` : ''}
      ${cta}
    </div>`;
  }

  function render(opts) {
    const target = opts && opts.target ? document.querySelector(opts.target) : null;
    if (!target) return;
    target.innerHTML = html(opts);
  }

  return { html, render };
})();
