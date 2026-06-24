// ════════════════════════════════════════════════════════════════
//  UTILS — Pure helper functions (no side effects, no DOM, no storage)
// ════════════════════════════════════════════════════════════════

// ── App Version ────────────────────────────────────────────────
const APP_VERSION = '1.0';

// ── Categories (single source of truth) ───────────────────────
const CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Other'];

// ── Account Type Constants ─────────────────────────────────────
const ACCOUNT_TYPES = ['bank', 'credit', 'cash'];

// ── Unique ID Generator ───────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Timestamp ──────────────────────────────────────────────────
function nowTimestamp() {
  return new Date().toISOString();
}

// ── Currency Formatting ────────────────────────────────────────
function fmt(val) {
  const n = Number(val);
  if (n === Infinity || n === -Infinity) return (n < 0 ? '-₹' : '₹') + '∞';
  return (n < 0 ? '-₹' : '₹') + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ── Sorting (newest first by createdAt, fallback to date) ─────
function sortNewestFirst(a, b) {
  const aKey = a.createdAt || a.date || '';
  const bKey = b.createdAt || b.date || '';
  return bKey.localeCompare(aKey);
}

// ── Date Display ───────────────────────────────────────────────
function formatActivityDate(dateStr, createdAt) {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today && createdAt) {
    try {
      const d = new Date(createdAt);
      return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return dateStr; }
  }
  return dateStr;
}

// ── Date Comparisons ───────────────────────────────────────────
function isCurrentMonth(date) {
  const d = new Date(date), now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLastMonth(date) {
  const d = new Date(date), now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
}

function inDateRange(date, from, to) {
  const d = new Date(date);
  if (from && d < new Date(from)) return false;
  if (to   && d > new Date(to))   return false;
  return true;
}

// ── Validation ─────────────────────────────────────────────────
function validateExpense(amount, category, date) {
  if (!amount || isNaN(amount) || Number(amount) <= 0) return 'Enter a valid amount.';
  if (!category) return 'Select a category.';
  if (!date) return 'Select a date.';
  return null;
}

function validateIncome(amount, source, date) {
  if (!amount || isNaN(amount) || Number(amount) <= 0) return 'Enter a valid amount.';
  if (!source || !source.trim()) return 'Enter a source.';
  if (!date) return 'Select a date.';
  return null;
}

function validateLending(personName, amount, date) {
  if (!personName || !personName.trim()) return 'Enter a person name.';
  if (!amount || isNaN(amount) || Number(amount) <= 0) return 'Enter a valid positive amount.';
  if (Number(amount) > 99999999) return 'Amount is too large.';
  if (!date) return 'Select a date.';
  if (isNaN(Date.parse(date))) return 'Enter a valid date.';
  return null;
}

function validateRecurring(type, amount, frequency, startDate, category, source) {
  if (!amount || isNaN(amount) || Number(amount) <= 0) return 'Enter a valid positive amount.';
  if (Number(amount) > 99999999) return 'Amount is too large.';
  if (!startDate) return 'Select a start date.';
  if (isNaN(Date.parse(startDate))) return 'Enter a valid date.';
  if (!frequency) return 'Select a frequency.';
  if (type === 'expense' && !category) return 'Select a category.';
  if (type === 'income' && (!source || !source.trim())) return 'Enter a source.';
  return null;
}

function validateAccount(name, type) {
  if (!name || !name.trim()) return 'Enter an account name.';
  if (name.trim().length > 50) return 'Account name is too long.';
  if (!type || !ACCOUNT_TYPES.includes(type)) return 'Select a valid account type.';
  return null;
}

// ── Aggregations ───────────────────────────────────────────────
function getTotalAmount(entries) {
  return entries.reduce((s, e) => s + Number(e.amount), 0);
}

function getCategoryTotals(entries) {
  const cats = {};
  entries.forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
  });
  return cats;
}

// ── HTML Escaping ──────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Reusable Formatters ────────────────────────────────────────
function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || singular + 's');
}

function formatRelativeDate(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const diffDays = Math.floor((today - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Toast Notification ─────────────────────────────────────────
function showToast(msg, type) {
  let toast = document.getElementById('_toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className   = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 2500);
}

// ── Debounce ───────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function () {
    const args = arguments;
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
  };
}

// ── Dark Mode ──────────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark ? '1' : '0');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '\u2600 Light' : '\u263E Dark';
}

(function applyTheme() {
  const isDark = localStorage.getItem('darkMode') === '1';
  if (isDark) document.body.classList.add('dark');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '\u2600 Light' : '\u263E Dark';
})();
