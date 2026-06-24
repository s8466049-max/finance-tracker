// ════════════════════════════════════════════════════════════════
//  LENDING UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

let currentFilter = 'all';
let returningId   = null;
let selectedId    = null;

// ── Init ───────────────────────────────────────────────────────
(function init() {
  document.getElementById('lendDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('returnDate').value = new Date().toISOString().split('T')[0];
  populateAccountDropdown('lendAccount',   { allowEmpty: true, placeholder: 'No Account' });
  populateAccountDropdown('returnAccount', { allowEmpty: true, placeholder: 'No Account' });
  renderSummary();
  renderList();
})();

// ── Summary Cards ──────────────────────────────────────────────
function renderSummary() {
  const all       = getAllLendings();
  const totalLent = all.reduce((s, l) => s + l.amountGiven, 0);
  const totalBack = all.reduce((s, l) => s + l.amountReturned, 0);
  const pending   = all.filter(l => l.status === 'pending').reduce((s, l) => s + l.remainingAmount, 0);
  const pendingCount = all.filter(l => l.status === 'pending').length;

  document.getElementById('totalLent').textContent      = fmt(totalLent);
  document.getElementById('totalPending').textContent   = fmt(pending);
  document.getElementById('totalRecovered').textContent = fmt(totalBack);

  // Lending signals
  const signalsEl = document.getElementById('lendingSignals');
  if (signalsEl) {
    const signals = [];
    if (pendingCount > 0) signals.push(`${pendingCount} ${pendingCount === 1 ? 'person owes' : 'people owe'} you money`);
    if (pending > 0) signals.push(`${fmt(pending)} pending`);
    if (all.length > 0) signals.push(`${all.length} total record${all.length > 1 ? 's' : ''}`);
    signalsEl.innerHTML = signals.map(s => `<span class="lending-signal">${s}</span>`).join('');
  }
}

// ── Add new lending ────────────────────────────────────────────
function addNewLending() {
  const person = document.getElementById('lendPerson').value.trim();
  const amount = parseFloat(document.getElementById('lendAmount').value);
  const date   = document.getElementById('lendDate').value;
  const acctId = document.getElementById('lendAccount').value;

  const err = validateLending(person, amount, date);
  if (err) { showToast(err, 'error'); return; }

  addLending(person, amount, date, acctId);
  invalidateAccountsCache();

  document.getElementById('lendPerson').value = '';
  document.getElementById('lendAmount').value = '';

  showToast(`Lent ${fmt(amount)} to ${person}`, 'success');
  renderSummary();
  renderList();
}

// ── Record return ──────────────────────────────────────────────
function startReturn(id, evt) {
  if (evt) evt.stopPropagation();
  const entry = getLendingById(id);
  if (!entry) return;
  returningId = id;
  document.getElementById('returnSection').style.display = '';
  document.getElementById('returnTitle').textContent = `Record Return from ${entry.personName} (remaining: ${fmt(entry.remainingAmount)})`;
  document.getElementById('returnAmount').value = '';
  document.getElementById('returnAmount').max   = entry.remainingAmount;
  document.getElementById('returnAmount').focus();
}

function cancelReturn() {
  returningId = null;
  document.getElementById('returnSection').style.display = 'none';
}

function recordReturn() {
  if (!returningId) return;
  const entry  = getLendingById(returningId);
  if (!entry) return;

  const amount = parseFloat(document.getElementById('returnAmount').value);
  const date   = document.getElementById('returnDate').value;
  const acctId = document.getElementById('returnAccount').value;

  if (!amount || isNaN(amount) || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (amount > entry.remainingAmount)          { showToast(`Max returnable: ${fmt(entry.remainingAmount)}`, 'error'); return; }
  if (!date)                                   { showToast('Select a date.', 'error'); return; }

  recordLendingPayment(returningId, amount, date, acctId);
  invalidateAccountsCache();

  showToast(`${entry.personName} returned ${fmt(amount)}`, 'success');
  cancelReturn();
  renderSummary();
  renderList();
  if (selectedId === returningId) showPersonHistory(selectedId);
}

// ── Delete lending ─────────────────────────────────────────────
function confirmDeleteLending(id, evt) {
  if (evt) evt.stopPropagation();
  const entry = getLendingById(id);
  if (!entry) return;
  if (!confirm(`Delete lending record for ${entry.personName}?`)) return;
  deleteLending(id);
  if (selectedId === id) {
    selectedId = null;
    document.getElementById('paymentHistory').style.display = 'none';
  }
  showUndoToast('Lending record deleted.');
  renderSummary();
  renderList();
}

// ── Filter ─────────────────────────────────────────────────────
function setLendFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderList();
}

// ── Row Selection & Person History ─────────────────────────────
function selectPerson(id) {
  selectedId = selectedId === id ? null : id;
  document.querySelectorAll('#lendingBody tr').forEach(tr => {
    tr.classList.toggle('lending-row-selected', tr.dataset.id === selectedId);
  });
  if (selectedId) {
    showPersonHistory(selectedId);
  } else {
    document.getElementById('paymentHistory').style.display = 'none';
  }
}

function showPersonHistory(id) {
  const entry = getLendingById(id);
  if (!entry) {
    document.getElementById('paymentHistory').style.display = 'none';
    return;
  }

  const section  = document.getElementById('paymentHistory');
  const titleEl  = document.getElementById('paymentHistoryTitle');
  const summEl   = document.getElementById('histSummary');
  const tbody    = document.getElementById('paymentHistoryBody');
  const emptyEl  = document.getElementById('historyEmpty');

  titleEl.textContent = `Transaction History – ${entry.personName}`;

  summEl.innerHTML = `
    <div class="lending-hist-stat">
      <span class="lending-hist-stat-label">Total Given</span>
      <span class="lending-hist-stat-value hist-given">${fmt(entry.amountGiven)}</span>
    </div>
    <div class="lending-hist-stat">
      <span class="lending-hist-stat-label">Total Returned</span>
      <span class="lending-hist-stat-value hist-returned">${fmt(entry.amountReturned)}</span>
    </div>
    <div class="lending-hist-stat">
      <span class="lending-hist-stat-label">Remaining</span>
      <span class="lending-hist-stat-value hist-remaining">${fmt(entry.remainingAmount)}</span>
    </div>`;

  const rows = [];
  rows.push({ type: 'Given', date: entry.dateGiven, amount: entry.amountGiven, accountId: entry.accountId || '' });
  (entry.payments || []).forEach(p => {
    rows.push({ type: 'Returned', date: p.date, amount: p.amount, accountId: p.accountId || '' });
  });

  if (rows.length <= 1 && !entry.payments.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    tbody.innerHTML = rows
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
      .map(r => {
        const typeClass = r.type === 'Given' ? 'lending-txn-given' : 'lending-txn-returned';
        return `<tr>
          <td data-label="Type"><span class="${typeClass}">${r.type}</span></td>
          <td data-label="Date">${r.date}</td>
          <td data-label="Amount">${fmt(r.amount)}</td>
          <td data-label="Account">${r.accountId ? getAccountName(r.accountId) : '—'}</td>
        </tr>`;
      }).join('');
  }

  section.style.display = '';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Render Table ───────────────────────────────────────────────
function renderList() {
  let list = getAllLendings();
  if (currentFilter !== 'all') {
    list = list.filter(l => l.status === currentFilter);
  }

  const tbody   = document.getElementById('lendingBody');
  const emptyEl = document.getElementById('lendingEmpty');

  if (!list.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'none';
    document.getElementById('paymentHistory').style.display = 'none';
    const tableWrap = tbody.closest('.table-wrap');
    if (tableWrap) {
      const existingEmpty = tableWrap.querySelector('.empty-state');
      if (existingEmpty) existingEmpty.remove();
      tableWrap.insertAdjacentHTML('beforeend', `<div class="empty-state">
        <div class="empty-state-icon">&#x1F91D;</div>
        <div class="empty-state-title">No lending records yet</div>
        <div class="empty-state-desc">Track money you've lent to friends and family.<br>Use the form above to add your first record.</div>
      </div>`);
    }
    return;
  }
  emptyEl.style.display = 'none';
  const tableWrap = tbody.closest('.table-wrap');
  if (tableWrap) {
    const existingEmpty = tableWrap.querySelector('.empty-state');
    if (existingEmpty) existingEmpty.remove();
  }

  tbody.innerHTML = list
    .sort((a, b) => (b.createdAt || b.dateGiven).localeCompare(a.createdAt || a.dateGiven))
    .map(l => {
      const statusClass = l.status === 'completed' ? 'lending-status-done' : 'lending-status-pending';
      const statusLabel = l.status === 'completed' ? '&#x2705; Completed' : '&#x1F7E1; Pending';
      const selClass    = l.id === selectedId ? ' lending-row-selected' : '';
      return `<tr data-id="${l.id}" class="lending-row${selClass}" onclick="selectPerson('${l.id}')">
        <td data-label="Person">${escapeHtml(l.personName)}</td>
        <td data-label="Given">${fmt(l.amountGiven)}</td>
        <td data-label="Returned">${fmt(l.amountReturned)}</td>
        <td data-label="Remaining">${fmt(l.remainingAmount)}</td>
        <td data-label="Date">${l.dateGiven}</td>
        <td data-label="Status"><span class="${statusClass}">${statusLabel}</span></td>
        <td data-label="Actions" class="lending-actions">
          ${l.status === 'pending' ? `<button class="lending-action-btn lending-action-return" onclick="startReturn('${l.id}', event)" title="Add Return Payment">&#x1F4B0; Return</button>` : ''}
          <button class="lending-action-btn lending-action-history" onclick="event.stopPropagation(); selectPerson('${l.id}')" title="View History">&#x1F4CB; History</button>
          <button class="lending-action-btn lending-action-delete" onclick="confirmDeleteLending('${l.id}', event)" title="Delete Entry">&#x1F5D1; Delete</button>
        </td>
      </tr>`;
    }).join('');

  if (selectedId && list.some(l => l.id === selectedId)) {
    showPersonHistory(selectedId);
  } else if (selectedId) {
    selectedId = null;
    document.getElementById('paymentHistory').style.display = 'none';
  }
}
