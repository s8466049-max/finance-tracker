/* ═══════════════════════════════════════════════════════════════
   Shared Slider Utilities — Calculators Module
   ═══════════════════════════════════════════════════════════════
   Exposes globals (intentional — matches existing module pattern):
     - syncSlider(numId, sliderId, onChange)
     - updateRangeFill(id)
     - bindSliders(pairs, onChange)   // convenience helper
   ═══════════════════════════════════════════════════════════════ */

/**
 * Two-way bind a number input with a range slider.
 * Calls `onChange()` after every interaction.
 */
function syncSlider(numId, sliderId, onChange) {
  const num = document.getElementById(numId);
  const slider = document.getElementById(sliderId);
  if (!num || !slider) return;

  const handler = (src, dst) => {
    dst.value = src.value;
    if (typeof onChange === 'function') onChange();
  };
  num.addEventListener('input', () => handler(num, slider));
  slider.addEventListener('input', () => handler(slider, num));
}

/**
 * Paint a gradient fill on a range input that reflects its current value.
 */
function updateRangeFill(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 100;
  const val = parseFloat(el.value) || 0;
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((val - min) / span) * 100));
  el.style.background =
    'linear-gradient(90deg, var(--primary) 0%, var(--primary) ' + pct +
    '%, var(--border) ' + pct + '%, var(--border) 100%)';
}

/**
 * Convenience: bind multiple [numId, sliderId] pairs and update all fills.
 */
function bindSliders(pairs, onChange) {
  pairs.forEach(([numId, sliderId]) => {
    syncSlider(numId, sliderId, onChange);
  });
}

/**
 * Update fills for a list of slider ids.
 */
function updateAllRangeFills(ids) {
  ids.forEach(updateRangeFill);
}
