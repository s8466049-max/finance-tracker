// ════════════════════════════════════════════════════════════════
//  EXPENSES UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

let editId = null;
const EXPENSE_PAGE_SIZE = 50;
let expenseDisplayLimit = EXPENSE_PAGE_SIZE;

// ── Filtering (delegates to filterStateService + expenseService) ──
function setFilter(f) {
  setExpenseFilter(f);
  expenseDisplayLimit = EXPENSE_PAGE_SIZE;
  const sel = document.getElementById('filterPeriod');
  if (sel) sel.value = f;
  document.getElementById('rangeInputs').style.display = f === 'custom' ? 'flex' : 'none';
  render();
}

function applyCustomRange() {
  const from = document.getElementById('filterFrom').value;
  const to   = document.getElementById('filterTo').value;
  setExpenseCustomRange(from, to);
  expenseDisplayLimit = EXPENSE_PAGE_SIZE;
  render();
}

function setSearch(q) {
  setExpenseSearch(q);
  expenseDisplayLimit = EXPENSE_PAGE_SIZE;
  render();
}
const debouncedExpenseSearch = debounce(setSearch, 300);

// ── Add / Edit ─────────────────────────────────────────────────
function addExpense() {
  const amount    = parseFloat(document.getElementById('amount').value);
  const category  = document.getElementById('category').value;
  const date      = document.getElementById('date').value;
  const accountId = document.getElementById('expAccount').value || '';

  const err = validateExpense(amount, category, date);
  if (err) { showToast(err); return; }

  if (!accountId && getAllAccounts().length > 0) {
    showToast('Tip: Selecting an account is recommended', 'warning');
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;

  if (editId !== null) {
    updateExpense(editId, amount, category, date, accountId);
    showToast('Expense updated!');
    cancelEdit();
  } else {
    createExpense(amount, category, date, accountId);
    setLastUsedAccount('expense', accountId);
    document.getElementById('amount').value   = '';
    document.getElementById('category').value = '';
    document.getElementById('date').value     = new Date().toISOString().split('T')[0];
    document.getElementById('amount').focus();
    showToast('Expense added!');
    checkBudget(category);
  }

  btn.disabled = false;
  updateAccountFeedback('expAccount', 'expAccountFeedback');
  render();
}

function editExpense(id) {
  const e = getAllExpenses().find(e => e.id === id);
  if (!e) return;
  document.getElementById('amount').value     = e.amount;
  document.getElementById('category').value   = e.category;
  document.getElementById('expAccount').value = e.accountId || '';
  document.getElementById('date').value       = e.date;
  document.getElementById('submitBtn').textContent   = 'Update Expense';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  editId = id;
  document.getElementById('amount').focus();
}

function cancelEdit() {
  editId = null;
  document.getElementById('amount').value     = '';
  document.getElementById('category').value   = '';
  document.getElementById('expAccount').value = getDefaultAccountId('expense');
  document.getElementById('date').value       = new Date().toISOString().split('T')[0];
  document.getElementById('submitBtn').textContent   = 'Add Expense';
  document.getElementById('cancelBtn').style.display = 'none';
  updateAccountFeedback('expAccount', 'expAccountFeedback');
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  deleteExpenseById(id);
  if (editId === id) cancelEdit();
  showUndoToast('Expense deleted.');
  render();
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  const tbody    = document.getElementById('expenseList');
  const emptyMsg = document.getElementById('emptyMsg');
  const totalEl  = document.getElementById('expenseTotal');
  tbody.innerHTML = '';

  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    emptyMsg.style.display = 'none';
    if (totalEl) totalEl.textContent = '';
    const tableWrap = tbody.closest('.table-wrap');
    let emptyState = tableWrap ? tableWrap.querySelector('.empty-state') : null;
    if (!emptyState && tableWrap) {
      tableWrap.insertAdjacentHTML('beforeend', `<div class="empty-state">
        <div class="empty-state-icon">&#x1F4B8;</div>
        <div class="empty-state-title">No expenses yet</div>
        <div class="empty-state-desc">Start tracking your spending to see where your money goes.</div>
        <div class="empty-state-actions">
          <button class="empty-state-action" onclick="document.getElementById('amount').focus()">&#x2795; Add your first expense</button>
        </div>
      </div>`);
    } else if (emptyState) {
      emptyState.style.display = '';
    }
    return;
  }

  emptyMsg.style.display = 'none';
  const tableWrap = tbody.closest('.table-wrap');
  if (tableWrap) {
    const emptyState = tableWrap.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = 'none';
  }

  const visible = filtered.slice(0, expenseDisplayLimit);
  visible.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = 'row-enter';
    const recurBadge = (e.source === 'recurring' || e.recurringId) ? '<span class="recurring-src-badge" title="Generated from recurring">&#x1F504;</span>' : '';
    tr.innerHTML = `
      <td data-label="Date">${e.date}</td>
      <td data-label="Category">${e.category} ${recurBadge}</td>
      <td data-label="Payment Method">${getAccountName(e.accountId)}</td>
      <td data-label="Amount">${fmt(e.amount)}</td>
      <td data-label="">
        <button class="btn-edit"   onclick="editExpense('${e.id}')">&#9998;</button>
        <button class="btn-delete" onclick="deleteExpense('${e.id}')">&#x2715;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Load More button
  const existingLoadMore = document.getElementById('expLoadMore');
  if (existingLoadMore) existingLoadMore.remove();
  if (filtered.length > expenseDisplayLimit) {
    const remaining = filtered.length - expenseDisplayLimit;
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'expLoadMore';
    loadMoreBtn.className = 'btn-export';
    loadMoreBtn.style.cssText = 'margin:var(--space-md) auto;display:block;';
    loadMoreBtn.textContent = 'Load More (' + remaining + ' remaining)';
    loadMoreBtn.onclick = function () { expenseDisplayLimit += EXPENSE_PAGE_SIZE; render(); };
    tbody.closest('.table-wrap').appendChild(loadMoreBtn);
  }

  if (totalEl) totalEl.textContent = 'Total: ' + fmt(getTotalAmount(filtered)) + ' (' + filtered.length + ' transaction' + (filtered.length === 1 ? '' : 's') + ')';
}

// ── Quick Add ──────────────────────────────────────────────────
function quickAddExpense(amount, category) {
  const today     = new Date().toISOString().split('T')[0];
  const accountId = document.getElementById('qaAccount').value || '';
  createExpense(Number(amount), category, today, accountId);
  if (accountId) setLastUsedAccount('expense', accountId);
  const accName = accountId ? getAccountName(accountId) : '';
  const msg = accName && accName !== '—'
    ? `${fmt(amount)} ${category} added via ${accName}`
    : `Added ${fmt(amount)} – ${category}`;
  showToast(msg, 'success');
  checkBudget(category);
  render();
}

function saveQuickPreset() {
  const amount   = parseFloat(document.getElementById('qaAmount').value);
  const category = document.getElementById('qaCategory').value;
  const label    = document.getElementById('qaLabel').value.trim() || category;

  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!category)               { showToast('Select a category.', 'error');  return; }

  const presets = getQuickPresets();
  presets.push({ label, amount, category });
  saveQuickPresets(presets);

  document.getElementById('qaAmount').value = '';
  document.getElementById('qaLabel').value  = '';
  renderQuickAdd();
  showToast('Quick preset saved!', 'success');
}

function deleteQuickPreset(idx) {
  const presets = getQuickPresets();
  presets.splice(idx, 1);
  saveQuickPresets(presets);
  renderQuickAdd();
}

function renderQuickAdd() {
  const presets = getQuickPresets();
  document.getElementById('quickAddBar').innerHTML = presets.map((p, i) =>
    `<span class="quick-add-chip">
       <button class="quick-add-btn" onclick="quickAddExpense(${p.amount},'${p.category}')" title="Add ${p.label} ₹${p.amount}">
         ${p.label} <span class="qa-amount">${fmt(p.amount)}</span>
       </button>
       <button class="quick-add-del" onclick="deleteQuickPreset(${i})" title="Remove">&#x2715;</button>
     </span>`
  ).join('');
}

function updateQaAccountFeedback() {
  const sel = document.getElementById('qaAccount');
  const fb  = document.getElementById('qaAccountFeedback');
  if (!fb || !sel) return;
  const accId = sel.value;
  if (!accId) { fb.textContent = ''; fb.className = 'account-feedback'; return; }
  const acc = getAccountById(accId);
  if (!acc) { fb.textContent = ''; fb.className = 'account-feedback'; return; }
  const typeLabel = acc.type === 'credit' ? 'Credit Card' : acc.type === 'bank' ? 'Bank Account' : 'Cash';
  fb.textContent = acc.name + ' (' + typeLabel + ')';
  fb.className = 'account-feedback account-feedback--' + acc.type;
}

// ── Init ───────────────────────────────────────────────────────
populateCategoryDropdown('category');
populateAccountDropdown('expAccount', { allowEmpty: true, placeholder: 'No Account' });

const _defaultExpAcc = getDefaultAccountId('expense');
if (_defaultExpAcc) document.getElementById('expAccount').value = _defaultExpAcc;

document.getElementById('expAccount').addEventListener('change', function() {
  updateAccountFeedback('expAccount', 'expAccountFeedback');
});
updateAccountFeedback('expAccount', 'expAccountFeedback');

document.getElementById('date').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense();
});
document.getElementById('date').value = new Date().toISOString().split('T')[0];
document.getElementById('amount').focus();

render();

// Quick Add init
populateCategoryDropdown('qaCategory');
renderQuickAdd();
populateAccountDropdown('qaAccount', { allowEmpty: true, placeholder: 'No Account' });
const _defaultQaAcc = getDefaultAccountId('expense');
if (_defaultQaAcc) document.getElementById('qaAccount').value = _defaultQaAcc;
document.getElementById('qaAccount').addEventListener('change', updateQaAccountFeedback);
updateQaAccountFeedback();
