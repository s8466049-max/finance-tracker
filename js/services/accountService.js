// ════════════════════════════════════════════════════════════════
//  ACCOUNT SERVICE — UI helpers for account dropdowns & feedback
// ════════════════════════════════════════════════════════════════

function populateCategoryDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const placeholder = document.createElement('option');
  placeholder.value       = '';
  placeholder.textContent = '-- Select Category --';
  placeholder.disabled    = true;
  placeholder.selected    = true;
  sel.appendChild(placeholder);
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function populateAccountDropdown(selectId, opts) {
  opts = opts || {};
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = opts.placeholder || '-- Select Account --';
  if (!opts.allowEmpty) {
    placeholder.disabled = true;
  }
  placeholder.selected = true;
  sel.appendChild(placeholder);

  const accounts = getAllAccounts();
  const groups = { credit: [], bank: [], cash: [] };
  accounts.forEach(acc => {
    if (opts.type && acc.type !== opts.type) return;
    groups[acc.type] = groups[acc.type] || [];
    groups[acc.type].push(acc);
  });

  const groupLabels = { credit: 'Credit Cards', bank: 'Bank Accounts', cash: 'Cash' };
  const groupOrder  = ['credit', 'bank', 'cash'];

  groupOrder.forEach(type => {
    if (!groups[type] || groups[type].length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupLabels[type] || type;
    groups[type].forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      optgroup.appendChild(opt);
    });
    sel.appendChild(optgroup);
  });
}

function updateAccountFeedback(selectId, feedbackId, prefix) {
  const sel = document.getElementById(selectId);
  const fb  = document.getElementById(feedbackId);
  if (!fb) return;
  const accId = sel ? sel.value : '';
  if (!accId) { fb.textContent = ''; fb.className = 'account-feedback'; return; }
  const acc = getAccountById(accId);
  if (!acc) { fb.textContent = ''; fb.className = 'account-feedback'; return; }
  const typeLabel = acc.type === 'credit' ? 'Credit Card' : acc.type === 'bank' ? 'Bank Account' : 'Cash';
  fb.textContent = (prefix || 'Paid via') + ': ' + acc.name + ' (' + typeLabel + ')';
  fb.className = 'account-feedback account-feedback--' + acc.type;
}
