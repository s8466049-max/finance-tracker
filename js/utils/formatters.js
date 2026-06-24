/* ═══════════════════════════════════════════════════════════════
   Formatters — Centralized display formatting for the app.
   Pure functions, no DOM, no side effects. Safe to use anywhere.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Format a percentage value with adaptive precision.
 *
 *   12        → "12%"
 *   12.2      → "12.2%"
 *   12.25     → "12.25%"
 *   12.256    → "12.26%"   (rounded to maxDecimals)
 *   12.00     → "12%"      (trailing zeros trimmed)
 *
 * @param {number} value         The percentage value (already in %, e.g. 12.5).
 * @param {object} [opts]
 * @param {number} [opts.maxDecimals=2]  Maximum decimals to display.
 * @param {number} [opts.minDecimals=0]  Minimum decimals to display.
 * @param {boolean}[opts.suffix=true]    Append the "%" suffix.
 */
function formatPercentage(value, opts) {
  const o = opts || {};
  const maxDecimals = Number.isFinite(o.maxDecimals) ? o.maxDecimals : 2;
  const minDecimals = Number.isFinite(o.minDecimals) ? o.minDecimals : 0;
  const suffix = o.suffix === false ? '' : '%';

  const n = Number(value);
  if (!isFinite(n)) return '—' + suffix;

  // Round to maxDecimals using a precision-safe approach.
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(n * factor) / factor;

  // Build the string at maxDecimals, then trim trailing zeros down to minDecimals.
  let str = rounded.toFixed(maxDecimals);
  if (str.indexOf('.') !== -1) {
    str = str.replace(/0+$/, '');           // trim trailing zeros
    str = str.replace(/\.$/, '');           // trim dangling dot
    // Re-pad if we trimmed below minDecimals
    if (minDecimals > 0) {
      const dot = str.indexOf('.');
      const have = dot === -1 ? 0 : str.length - dot - 1;
      if (have < minDecimals) {
        str = (dot === -1 ? str + '.' : str) + '0'.repeat(minDecimals - have);
      }
    }
  } else if (minDecimals > 0) {
    str = str + '.' + '0'.repeat(minDecimals);
  }

  return str + suffix;
}

/**
 * Indian-locale currency formatter.
 *   1234567 → "₹12,34,567"
 * @param {number} value
 * @param {object} [opts]
 * @param {number} [opts.decimals=0]
 * @param {string} [opts.symbol='₹']
 */
function formatCurrency(value, opts) {
  const o = opts || {};
  const decimals = Number.isFinite(o.decimals) ? o.decimals : 0;
  const symbol = o.symbol == null ? '₹' : o.symbol;
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return sign + symbol + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Compact currency for charts/insights.
 *   123        → "₹123"
 *   12300      → "₹12.3K"
 *   1230000    → "₹12.3L"
 *   123000000  → "₹12.3Cr"
 */
function formatCompactCurrency(value, opts) {
  const o = opts || {};
  const symbol = o.symbol == null ? '₹' : o.symbol;
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (num, d) => formatPercentage(num, { maxDecimals: d, suffix: false });

  if (abs >= 1e7) return sign + symbol + trim(abs / 1e7, 2) + ' Cr';
  if (abs >= 1e5) return sign + symbol + trim(abs / 1e5, 2) + ' L';
  if (abs >= 1e3) return sign + symbol + trim(abs / 1e3, 1) + 'K';
  return sign + symbol + Math.round(abs);
}

/**
 * Plain number formatter with adaptive decimals (uses Indian grouping).
 */
function formatNumber(value, opts) {
  const o = opts || {};
  const maxDecimals = Number.isFinite(o.maxDecimals) ? o.maxDecimals : 2;
  const minDecimals = Number.isFinite(o.minDecimals) ? o.minDecimals : 0;
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  });
}

// Expose globally (the app loads scripts via classic <script> tags, no module system).
if (typeof window !== 'undefined') {
  window.formatPercentage = formatPercentage;
  window.formatCurrency = formatCurrency;
  window.formatCompactCurrency = formatCompactCurrency;
  window.formatNumber = formatNumber;
}
