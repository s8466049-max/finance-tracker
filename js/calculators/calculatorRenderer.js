/* Calculator selector / panel switcher */
(function () {
  function init() {
    const tiles = document.querySelectorAll('.calc-tile[data-target]');
    if (!tiles.length) return;

    tiles.forEach(tile => {
      tile.addEventListener('click', () => activate(tile.dataset.target));
    });

    function activate(target) {
      tiles.forEach(t => {
        const isActive = t.dataset.target === target;
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.calc-panel').forEach(p => {
        p.classList.toggle('is-active', p.id === 'panel-' + target);
      });
      // Re-trigger render so charts size correctly when newly visible
      window.dispatchEvent(new CustomEvent('calc:activated', { detail: { target } }));
    }
  }

  /**
   * Watch hero metric values; flash them whenever content changes.
   * Adds `.is-flash` for the duration of the CSS animation.
   */
  function attachMetricFlash() {
    const heroValues = document.querySelectorAll('.calc-metric-hero .calc-metric-value');
    heroValues.forEach(el => {
      const obs = new MutationObserver(() => {
        el.classList.remove('is-flash');
        // Force reflow so the animation can replay.
        void el.offsetWidth;
        el.classList.add('is-flash');
      });
      obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  function bootstrap() {
    init();
    attachMetricFlash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
