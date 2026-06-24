// ════════════════════════════════════════════════════════════════
//  Validation Core — Reusable validation rules + result envelope
//  Each validator returns { ok: boolean, errors: { field: msg } }
// ════════════════════════════════════════════════════════════════

const Validation = (function () {

  // ── Result helpers ───────────────────────────────────────────
  function ok(value) { return { ok: true, errors: {}, value: value }; }
  function fail(errors) { return { ok: false, errors: errors || {} }; }

  // ── Sanitization helpers ─────────────────────────────────────
  function sanitizeString(v, max) {
    if (v == null) return '';
    let s = String(v).trim();
    s = s.replace(/[<>]/g, ''); // strip angle brackets
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }
  function sanitizeNumber(v) {
    const n = Number(String(v).replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }
  function sanitizeDate(v) {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ── Generic rule helpers ─────────────────────────────────────
  const rules = {
    required(v, msg) {
      if (v === null || v === undefined || String(v).trim() === '')
        return msg || 'This field is required';
      return null;
    },
    minLength(v, n, msg) {
      if (String(v || '').length < n) return msg || `Must be at least ${n} characters`;
      return null;
    },
    maxLength(v, n, msg) {
      if (String(v || '').length > n) return msg || `Must be at most ${n} characters`;
      return null;
    },
    isNumber(v, msg) {
      const n = sanitizeNumber(v);
      if (!Number.isFinite(n)) return msg || 'Must be a valid number';
      return null;
    },
    min(v, n, msg) {
      const num = sanitizeNumber(v);
      if (!Number.isFinite(num) || num < n) return msg || `Must be ≥ ${n}`;
      return null;
    },
    max(v, n, msg) {
      const num = sanitizeNumber(v);
      if (!Number.isFinite(num) || num > n) return msg || `Must be ≤ ${n}`;
      return null;
    },
    positive(v, msg) {
      const n = sanitizeNumber(v);
      if (!Number.isFinite(n) || n <= 0) return msg || 'Must be greater than 0';
      return null;
    },
    nonNegative(v, msg) {
      const n = sanitizeNumber(v);
      if (!Number.isFinite(n) || n < 0) return msg || 'Cannot be negative';
      return null;
    },
    isDate(v, msg) {
      if (!v) return msg || 'Date is required';
      const d = new Date(v);
      if (isNaN(d.getTime())) return msg || 'Invalid date';
      return null;
    },
    notFuture(v, msg) {
      const d = new Date(v);
      if (d > new Date()) return msg || 'Date cannot be in the future';
      return null;
    },
    oneOf(v, list, msg) {
      if (!list.includes(v)) return msg || `Must be one of: ${list.join(', ')}`;
      return null;
    }
  };

  // ── Run a schema { field: [ruleFn, ...] } against data ───────
  function run(data, schema) {
    const errors = {};
    Object.keys(schema).forEach(field => {
      const checks = schema[field];
      for (let i = 0; i < checks.length; i++) {
        const err = checks[i](data[field], data);
        if (err) { errors[field] = err; break; }
      }
    });
    return Object.keys(errors).length ? fail(errors) : ok(data);
  }

  // ── Bind error display to a form (optional UI helper) ────────
  function showErrors(formEl, errors) {
    if (!formEl) return;
    formEl.querySelectorAll('[data-error-for]').forEach(n => { n.textContent = ''; });
    formEl.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid'));
    Object.keys(errors).forEach(field => {
      const input = formEl.querySelector(`[name="${field}"]`);
      if (input) input.classList.add('is-invalid');
      const slot = formEl.querySelector(`[data-error-for="${field}"]`);
      if (slot) slot.textContent = errors[field];
    });
  }

  return {
    ok, fail, run, rules, showErrors,
    sanitize: { string: sanitizeString, number: sanitizeNumber, date: sanitizeDate }
  };
})();

if (typeof window !== 'undefined') window.Validation = Validation;
