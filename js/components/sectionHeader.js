// ════════════════════════════════════════════════════════════════
//  Component: SectionHeader — Reusable section title row
//  Usage: SectionHeader.html({ title, subtitle, actionLabel, actionHref })
// ════════════════════════════════════════════════════════════════

const SectionHeader = (function () {
  function html(opts) {
    const o = opts || {};
    const title    = o.title || '';
    const subtitle = o.subtitle
      ? `<span class="c-section-header__subtitle">${o.subtitle}</span>`
      : '';
    const action = (o.actionLabel && o.actionHref)
      ? `<a class="c-section-header__action" href="${o.actionHref}">${o.actionLabel} &rarr;</a>`
      : '';
    return `<div class="c-section-header">
      <div>
        <span class="c-section-header__title">${title}</span>
        ${subtitle}
      </div>
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
