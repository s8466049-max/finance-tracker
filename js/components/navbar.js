// ════════════════════════════════════════════════════════════════
//  Component: Navbar — Centralized navigation rendering
//  Renders the consistent top nav across all pages.
//  Usage: <nav id="appNav"></nav> + Navbar.render({ active, basePath })
// ════════════════════════════════════════════════════════════════

const Navbar = (function () {
  const NAV_STRUCTURE = [
    { type: 'link',  id: 'dashboard',   label: 'Dashboard', href: 'index.html' },
    {
      type: 'group', id: 'money',       label: 'Money',
      items: [
        { id: 'accounts',    label: 'Accounts',    href: 'views/accounts.html' },
        { id: 'investments', label: 'Investments', href: 'views/investments.html' }
      ]
    },
    {
      type: 'group', id: 'tracking',    label: 'Tracking',
      items: [
        { id: 'expenses',  label: 'Expenses',  href: 'views/expenses.html' },
        { id: 'income',    label: 'Income',    href: 'views/income.html' },
        { id: 'budget',    label: 'Budget',    href: 'views/budget.html' },
        { id: 'recurring', label: 'Recurring', href: 'views/recurring.html' }
      ]
    },
    {
      type: 'group', id: 'others',      label: 'Others',
      items: [
        { id: 'lending', label: 'Money Given', href: 'views/lending.html' }
      ]
    },
    {
      type: 'group', id: 'insights',    label: 'Insights',
      items: [
        { id: 'analytics', label: 'Analytics', href: 'views/analytics.html' }
      ]
    },
    { type: 'link',  id: 'calculators', label: 'Calculators', href: 'views/calculators.html' }
  ];

  function resolveHref(href, basePath) {
    if (basePath === 'root') return href;
    // basePath === 'views' — page is inside /views, so strip prefix or back up
    if (href === 'index.html') return '../index.html';
    if (href.startsWith('views/')) return href.slice('views/'.length);
    return href;
  }

  function buildLink(item, activeId, basePath) {
    const href = resolveHref(item.href, basePath);
    const cls  = item.id === activeId ? ' class="active"' : '';
    return `<a href="${href}"${cls}>${item.label}</a>`;
  }

  function buildGroup(group, activeId, basePath) {
    const isActive = group.items.some(i => i.id === activeId);
    const groupCls = isActive ? 'nav-group nav-group--active' : 'nav-group';
    const links = group.items.map(i => buildLink(i, activeId, basePath)).join('\n        ');
    return `<div class="${groupCls}">
      <span class="nav-group-btn">${group.label} <span class="nav-arrow">&#9662;</span></span>
      <div class="nav-dropdown">
        ${links}
      </div>
    </div>`;
  }

  function build(activeId, basePath) {
    const parts = NAV_STRUCTURE.map(node => {
      if (node.type === 'link')  return buildLink(node, activeId, basePath);
      if (node.type === 'group') return buildGroup(node, activeId, basePath);
      return '';
    });
    parts.push('<button id="darkModeBtn" class="btn-dark-toggle" onclick="toggleDarkMode()">&#9790; Dark</button>');
    return parts.join('\n    ');
  }

  function render(opts) {
    const opts_ = opts || {};
    const activeId = opts_.active || '';
    const basePath = opts_.basePath || 'root';
    const target   = opts_.target ? document.querySelector(opts_.target) : document.querySelector('nav[data-app-nav]');
    if (!target) return;
    target.innerHTML = build(activeId, basePath);
  }

  // Auto-render on DOMContentLoaded if a <nav data-app-nav> element exists
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('nav[data-app-nav]');
    if (!el) return;
    render({
      active:   el.getAttribute('data-active')    || '',
      basePath: el.getAttribute('data-base-path') || 'root'
    });

    // Add click handlers for mobile dropdown toggle
    const navGroups = document.querySelectorAll('.nav-group');
    navGroups.forEach(group => {
      const btn = group.querySelector('.nav-group-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Close other open dropdowns
          navGroups.forEach(g => {
            if (g !== group) g.classList.remove('nav-group--open');
          });
          
          // Toggle current dropdown
          group.classList.toggle('nav-group--open');
        });
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      navGroups.forEach(g => g.classList.remove('nav-group--open'));
    });
  });

  return { render, build };
})();
