// ════════════════════════════════════════════════════════════════
//  ACCOUNTS UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

let editingId = null;

function toggleCCFields() {
  const isCC = document.getElementById('accType').value === 'credit';
  document.getElementById('accBillingDay').style.display = isCC ? '' : 'none';
  document.getElementById('accDueDay').style.display     = isCC ? '' : 'none';
}

function addAccount() {
  const name    = document.getElementById('accName').value.trim();
  const type    = document.getElementById('accType').value;
  const balance = parseFloat(document.getElementById('accBalance').value) || 0;

  const err = validateAccount(name, type);
  if (err) { showToast(err, 'error'); return; }

  const billingDay = parseInt(document.getElementById('accBillingDay').value) || 1;
  const dueDay     = parseInt(document.getElementById('accDueDay').value)     || 15;

  if (editingId) {
    updateAccount(editingId, name, type, balance, billingDay, dueDay);
    showToast('Account updated!', 'success');
    editingId = null;
    document.getElementById('accSubmitBtn').textContent   = 'Add Account';
    document.getElementById('accCancelBtn').style.display = 'none';
  } else {
    createAccount(name, type, balance, billingDay, dueDay);
    showToast('Account added!', 'success');
  }

  clearForm();
  render();
}

function editAccount(id) {
  const acc = getAccountById(id);
  if (!acc) return;
  editingId = id;
  document.getElementById('accName').value    = acc.name;
  document.getElementById('accType').value    = acc.type;
  document.getElementById('accBalance').value = acc.balance;
  toggleCCFields();
  if (acc.type === 'credit') {
    document.getElementById('accBillingDay').value = acc.billingDay || 1;
    document.getElementById('accDueDay').value     = acc.dueDay     || 15;
  }
  document.getElementById('accSubmitBtn').textContent   = 'Update Account';
  document.getElementById('accCancelBtn').style.display = 'inline-block';
  document.getElementById('accName').focus();
}

function cancelEditAccount() {
  editingId = null;
  clearForm();
  document.getElementById('accSubmitBtn').textContent   = 'Add Account';
  document.getElementById('accCancelBtn').style.display = 'none';
}

function deleteAccount(id) {
  const linked = getLinkedTransactionCount(id);
  let msg = 'Delete this account?';
  if (linked.total > 0) {
    msg = `This account has ${linked.total} linked transaction${linked.total > 1 ? 's' : ''}`;
    if (linked.expenses > 0) msg += `\n• ${linked.expenses} expense${linked.expenses > 1 ? 's' : ''}`;
    if (linked.income > 0)   msg += `\n• ${linked.income} income entr${linked.income > 1 ? 'ies' : 'y'}`;
    if (linked.lending > 0)  msg += `\n• ${linked.lending} lending record${linked.lending > 1 ? 's' : ''}`;
    msg += '\n\nThese transactions will keep their data but show "(Deleted Account)".\nDelete anyway?';
  }
  if (!confirm(msg)) return;
  deleteAccountById(id);
  if (editingId === id) cancelEditAccount();
  render();
  showUndoToast('Account deleted.');
}

function clearForm() {
  document.getElementById('accName').value       = '';
  document.getElementById('accType').value       = 'bank';
  document.getElementById('accBalance').value    = '';
  document.getElementById('accBillingDay').value = '1';
  document.getElementById('accDueDay').value     = '15';
  toggleCCFields();
}

function render() {
  const accounts = getAllAccounts();

  document.getElementById('bankTotalDisplay').textContent = fmt(getTotalByAccountType('bank'));
  document.getElementById('ccTotalDisplay').textContent   = fmt(getTotalByAccountType('credit'));
  document.getElementById('cashTotalDisplay').textContent = fmt(getTotalByAccountType('cash'));
  document.getElementById('netWorthDisplay').textContent  = fmt(getNetWorth());

  const listEl = document.getElementById('accountList');
  if (accounts.length === 0) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#x1F3E6;</div>
      <div class="empty-state-title">No accounts yet</div>
      <div class="empty-state-desc">Add your bank accounts, credit cards, and cash wallets<br>to track where your money goes.</div>
      <div class="empty-state-actions">
        <button class="empty-state-action" onclick="document.getElementById('accName').focus()">&#x2795; Add your first account</button>
      </div>
    </div>`;
  } else {
    const signalHtml = `<div class="dash-signals" style="margin-bottom:var(--space-md);">
      <span class="dash-signal">Tracking ${accounts.length} account${accounts.length > 1 ? 's' : ''}</span>
    </div>`;
    listEl.innerHTML = signalHtml + accounts.map(acc => {
      const typeLabel = acc.type === 'credit' ? 'Credit Card' : acc.type === 'bank' ? 'Bank Account' : 'Cash';
      const typeIcon  = acc.type === 'credit' ? '&#x1F4B3;' : acc.type === 'bank' ? '&#x1F3E6;' : '&#x1F4B5;';
      const balClass  = acc.type === 'credit' ? 'cc-outstanding-text' : '';
      const balLabel  = acc.type === 'credit' ? 'Due: ' : '';
      let extra = '';
      if (acc.type === 'credit') {
        extra = '<div class="acc-meta">Billing Day: ' + (acc.billingDay || 1) + ' &middot; Due Day: ' + (acc.dueDay || 15) + '</div>';
      }
      return '<div class="account-item">' +
        '<div class="account-item-info">' +
          '<div class="account-item-icon">' + typeIcon + '</div>' +
          '<div>' +
            '<div class="account-item-name">' + acc.name + '</div>' +
            '<div class="account-item-type">' + typeLabel + '</div>' +
            extra +
          '</div>' +
        '</div>' +
        '<div class="account-item-right">' +
          '<div class="account-item-balance ' + balClass + '">' + balLabel + fmt(acc.balance) + '</div>' +
          '<div class="account-item-actions">' +
            '<button class="btn-edit" onclick="editAccount(\'' + acc.id + '\')">&#9998;</button>' +
            '<button class="btn-delete" onclick="deleteAccount(\'' + acc.id + '\')">&#x2715;</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  renderCCStatements();
}

function renderCCStatements() {
  const container  = document.getElementById('ccStatements');
  const ccAccounts = getAllAccounts().filter(a => a.type === 'credit');

  if (ccAccounts.length === 0) {
    container.innerHTML = '<p class="empty-msg">No credit cards added yet.</p>';
    return;
  }

  const now       = new Date();
  const month     = now.getMonth();
  const year      = now.getFullYear();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  container.innerHTML = ccAccounts.map(cc => {
    const expenses   = getCCMonthlySpend(cc.id, month, year);
    const totalSpend = getTotalAmount(expenses);

    let rows = '';
    if (expenses.length) {
      rows = expenses.slice().sort(sortNewestFirst).map(e =>
        '<div class="cc-stmt-row">' +
          '<span>' + e.date + '</span>' +
          '<span>' + e.category + '</span>' +
          '<span class="cc-stmt-amount">' + fmt(e.amount) + '</span>' +
        '</div>'
      ).join('');
    } else {
      rows = '<p class="empty-msg" style="padding:12px 0;">No charges this month.</p>';
    }

    return '<div class="cc-statement-card">' +
      '<div class="cc-stmt-header">' +
        '<div>' +
          '<div class="cc-stmt-name">&#x1F4B3; ' + cc.name + '</div>' +
          '<div class="cc-stmt-period">' + monthName + '</div>' +
        '</div>' +
        '<div class="cc-stmt-summary">' +
          '<div class="cc-stmt-stat">' +
            '<span class="cc-stmt-label">Monthly Spend</span>' +
            '<span class="cc-stmt-value">' + fmt(totalSpend) + '</span>' +
          '</div>' +
          '<div class="cc-stmt-stat">' +
            '<span class="cc-stmt-label">Due</span>' +
            '<span class="cc-stmt-value cc-outstanding-text">' + fmt(cc.balance) + '</span>' +
          '</div>' +
          '<div class="cc-stmt-stat">' +
            '<span class="cc-stmt-label">Due Date</span>' +
            '<span class="cc-stmt-value">' + (cc.dueDay || 15) + 'th</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cc-stmt-transactions">' + rows + '</div>' +
    '</div>';
  }).join('');
}

toggleCCFields();
render();
