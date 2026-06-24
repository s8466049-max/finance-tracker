// ════════════════════════════════════════════════════════════════
//  INCOME UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

let editId = null;
const INCOME_PAGE_SIZE = 50;
let incomeDisplayLimit = INCOME_PAGE_SIZE;

// ── Filtering (delegates to filterStateService + incomeService) ──
function setFilter(f) {
  setIncomeFilter(f);
  incomeDisplayLimit = INCOME_PAGE_SIZE;
  const sel = document.getElementById('filterPeriod');
  if (sel) sel.value = f;
  document.getElementById('rangeInputs').style.display = f === 'custom' ? 'flex' : 'none';
  render();
}

function applyCustomRange() {
  const from = document.getElementById('filterFrom').value;
  const to   = document.getElementById('filterTo').value;
  setIncomeCustomRange(from, to);
  incomeDisplayLimit = INCOME_PAGE_SIZE;
  render();
}

function setSearch(q) {
  setIncomeSearch(q);
  incomeDisplayLimit = INCOME_PAGE_SIZE;
  render();
}
const debouncedIncomeSearch = debounce(setSearch, 300);

// ── Add / Edit ─────────────────────────────────────────────────
function addIncome() {
  const amount    = parseFloat(document.getElementById('incomeAmount').value);
  const source    = document.getElementById('incomeSource').value.trim();
  const date      = document.getElementById('incomeDate').value;
  const accountId = document.getElementById('incAccount').value || '';

  const err = validateIncome(amount, source, date);
  if (err) { showToast(err); return; }

  if (!accountId && getAllAccounts().length > 0) {
    showToast('Tip: Selecting an account is recommended', 'warning');
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;

  if (editId !== null) {
    updateIncome(editId, amount, source, date, accountId);
    showToast('Income updated!');
    cancelEdit();
  } else {
    createIncome(amount, source, date, accountId);
    setLastUsedAccount('income', accountId);
    document.getElementById('incomeAmount').value  = '';
    document.getElementById('incomeSource').value  = '';
    document.getElementById('incomeDate').value    = new Date().toISOString().split('T')[0];
    document.getElementById('incomeAmount').focus();
    showToast('Income added!');
  }

  btn.disabled = false;
  updateAccountFeedback('incAccount', 'incAccountFeedback', 'Deposited to');
  render();
}

function editIncome(id) {
  const e = getAllIncome().find(e => e.id === id);
  if (!e) return;
  document.getElementById('incomeAmount').value = e.amount;
  document.getElementById('incomeSource').value = e.source;
  document.getElementById('incAccount').value   = e.accountId || '';
  document.getElementById('incomeDate').value   = e.date;
  document.getElementById('submitBtn').textContent   = 'Update Income';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  editId = id;
  document.getElementById('incomeAmount').focus();
}

function cancelEdit() {
  editId = null;
  document.getElementById('incomeAmount').value = '';
  document.getElementById('incomeSource').value = '';
  document.getElementById('incAccount').value   = getDefaultAccountId('income');
  document.getElementById('incomeDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('submitBtn').textContent   = 'Add Income';
  document.getElementById('cancelBtn').style.display = 'none';
  updateAccountFeedback('incAccount', 'incAccountFeedback', 'Deposited to');
}

function deleteIncome(id) {
  if (!confirm('Delete this income entry?')) return;
  deleteIncomeById(id);
  if (editId === id) cancelEdit();
  showUndoToast('Income entry deleted.');
  render();
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  const tbody    = document.getElementById('incomeList');
  const emptyMsg = document.getElementById('emptyMsg');
  const totalEl  = document.getElementById('incomeTotal');
  tbody.innerHTML = '';

  const filtered = getFilteredIncome();

  if (filtered.length === 0) {
    emptyMsg.style.display = 'none';
    if (totalEl) totalEl.textContent = '';
    const tableWrap = tbody.closest('.table-wrap');
    let emptyState = tableWrap ? tableWrap.querySelector('.empty-state') : null;
    if (!emptyState && tableWrap) {
      tableWrap.insertAdjacentHTML('beforeend', `<div class="empty-state">
        <div class="empty-state-icon">&#x1F4B5;</div>
        <div class="empty-state-title">No income entries yet</div>
        <div class="empty-state-desc">Record your income to track earnings and savings rate.</div>
        <div class="empty-state-actions">
          <button class="empty-state-action" onclick="document.getElementById('incomeAmount').focus()">&#x2795; Add your first income</button>
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

  const visible = filtered.slice(0, incomeDisplayLimit);
  visible.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = 'row-enter';
    const recurBadge = (e.recurringSource === 'recurring' || e.recurringId) ? '<span class="recurring-src-badge" title="Generated from recurring">&#x1F504;</span>' : '';
    tr.innerHTML = `
      <td data-label="Date">${e.date}</td>
      <td data-label="Source">${e.source} ${recurBadge}</td>
      <td data-label="Payment Method">${getAccountName(e.accountId)}</td>
      <td data-label="Amount">${fmt(e.amount)}</td>
      <td data-label="">
        <button class="btn-edit"   onclick="editIncome('${e.id}')">&#9998;</button>
        <button class="btn-delete" onclick="deleteIncome('${e.id}')">&#x2715;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Load More button
  const existingLoadMore = document.getElementById('incLoadMore');
  if (existingLoadMore) existingLoadMore.remove();
  if (filtered.length > incomeDisplayLimit) {
    const remaining = filtered.length - incomeDisplayLimit;
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'incLoadMore';
    loadMoreBtn.className = 'btn-export';
    loadMoreBtn.style.cssText = 'margin:var(--space-md) auto;display:block;';
    loadMoreBtn.textContent = 'Load More (' + remaining + ' remaining)';
    loadMoreBtn.onclick = function () { incomeDisplayLimit += INCOME_PAGE_SIZE; render(); };
    tbody.closest('.table-wrap').appendChild(loadMoreBtn);
  }

  if (totalEl) totalEl.textContent = 'Total: ' + fmt(getTotalAmount(filtered)) + ' (' + filtered.length + ' entr' + (filtered.length === 1 ? 'y' : 'ies') + ')';
}

// ── Init ───────────────────────────────────────────────────────
document.getElementById('incomeDate').addEventListener('keydown', e => {
  if (e.key === 'Enter') addIncome();
});
document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
document.getElementById('incomeAmount').focus();
populateAccountDropdown('incAccount', { allowEmpty: true, placeholder: 'No Account' });

const _defaultIncAcc = getDefaultAccountId('income');
if (_defaultIncAcc) document.getElementById('incAccount').value = _defaultIncAcc;

document.getElementById('incAccount').addEventListener('change', function() {
  updateAccountFeedback('incAccount', 'incAccountFeedback', 'Deposited to');
});
updateAccountFeedback('incAccount', 'incAccountFeedback', 'Deposited to');

render();

// ── Quick Add Income ───────────────────────────────────────────
function getIncomePresets() {
  try {
    const saved = JSON.parse(localStorage.getItem('incomeQuickPresets'));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function saveIncomePresets(presets) {
  localStorage.setItem('incomeQuickPresets', JSON.stringify(presets));
}

function quickAddIncome(amount, source) {
  const today = new Date().toISOString().split('T')[0];
  const accountId = getDefaultAccountId('income');
  createIncome(Number(amount), source, today, accountId);
  if (accountId) setLastUsedAccount('income', accountId);
  showToast(`${fmt(amount)} income from ${source} added`, 'success');
  render();
}

function saveIncomePreset() {
  const amount = parseFloat(document.getElementById('incQaAmount').value);
  const source = document.getElementById('incQaSource').value.trim();
  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!source) { showToast('Enter a source.', 'error'); return; }
  const presets = getIncomePresets();
  presets.push({ label: source, amount, source });
  saveIncomePresets(presets);
  document.getElementById('incQaAmount').value = '';
  document.getElementById('incQaSource').value = '';
  renderIncomeQuickAdd();
  showToast('Income preset saved!', 'success');
}

function deleteIncomePreset(idx) {
  const presets = getIncomePresets();
  presets.splice(idx, 1);
  saveIncomePresets(presets);
  renderIncomeQuickAdd();
}

function renderIncomeQuickAdd() {
  const presets = getIncomePresets();
  const bar = document.getElementById('incQuickAddBar');
  if (!bar) return;
  if (presets.length === 0) {
    bar.innerHTML = '<span style="font-size:12px;color:var(--text-faint);">No presets yet. Add one below.</span>';
    return;
  }
  bar.innerHTML = presets.map((p, i) =>
    `<span class="quick-add-chip">
       <button class="quick-add-btn" onclick="quickAddIncome(${p.amount},'${p.source.replace(/'/g, "\\'")}')" title="Add ${p.label} ₹${p.amount}">
         ${p.label} <span class="qa-amount">${fmt(p.amount)}</span>
       </button>
       <button class="quick-add-del" onclick="deleteIncomePreset(${i})" title="Remove">&#x2715;</button>
     </span>`
  ).join('');
}

renderIncomeQuickAdd();
