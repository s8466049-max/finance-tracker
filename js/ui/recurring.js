// ════════════════════════════════════════════════════════════════
//  RECURRING UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

function updateCatSrcLabel() {
  const type = document.getElementById('recurType').value;
  document.getElementById('recurCategory').style.display = type === 'expense' ? '' : 'none';
  document.getElementById('recurSource').style.display   = type === 'income'  ? '' : 'none';
}

// ── Add ────────────────────────────────────────────────────────
function addRecurring() {
  const type      = document.getElementById('recurType').value;
  const amount    = parseFloat(document.getElementById('recurAmount').value);
  const frequency = document.getElementById('recurFreq').value;
  const startDate = document.getElementById('recurStart').value;
  const cat       = document.getElementById('recurCategory').value;
  const src       = document.getElementById('recurSource').value.trim();
  const accountId = (document.getElementById('recurAccount') || {}).value || '';

  const err = validateRecurring(type, amount, frequency, startDate, cat, src);
  if (err) { showToast(err, 'error'); return; }

  const item = { type, amount, frequency, nextRun: startDate, accountId };

  if (type === 'expense') {
    item.category = cat;
  } else {
    item.source = src;
  }

  createRecurring(item);
  showToast('Recurring transaction added!', 'success');

  document.getElementById('recurAmount').value   = '';
  document.getElementById('recurCategory').value = '';
  document.getElementById('recurSource').value   = '';
  document.getElementById('recurStart').value    = new Date().toISOString().split('T')[0];

  render();
}

// ── Remove ─────────────────────────────────────────────────────
function removeRecurring(id) {
  if (!confirm('Remove this recurring transaction?')) return;
  deleteRecurringById(id);
  showUndoToast('Recurring transaction removed.');
  render();
}

// ── Pause / Resume ─────────────────────────────────────────────
function toggleActive(id) {
  const item = toggleRecurringActive(id);
  if (!item) return;
  showToast(item.active ? 'Resumed.' : 'Paused.', 'success');
  render();
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  const list = document.getElementById('recurringList');
  const items = getAllRecurring();

  // Render signals
  const signalsEl = document.getElementById('recurringSignals');
  if (signalsEl) {
    const signals = [];
    const activeItems = items.filter(i => i.active);
    if (activeItems.length > 0) {
      const monthlyImpact = activeItems.reduce((sum, i) => {
        let multiplier = 1;
        if (i.frequency === 'daily') multiplier = 30;
        else if (i.frequency === 'weekly') multiplier = 4;
        return sum + (i.amount * multiplier);
      }, 0);
      signals.push(`Monthly impact: ${fmt(Math.round(monthlyImpact))}`);
      signals.push(`${activeItems.length} active recurring`);
      const nextItem = activeItems.sort((a, b) => (a.nextRun || '').localeCompare(b.nextRun || ''))[0];
      if (nextItem && nextItem.nextRun) {
        const nextDate = new Date(nextItem.nextRun);
        const label = nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        signals.push(`Next run: ${label}`);
      }
    }
    signalsEl.innerHTML = signals.map(s => `<span class="recurring-signal">${s}</span>`).join('');
  }

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#x1F504;</div>
      <div class="empty-state-title">No recurring transactions yet</div>
      <div class="empty-state-desc">Set up automatic expenses or income to save time.<br>They'll be added automatically on schedule.</div>
    </div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const catOrSrc  = item.type === 'expense' ? (item.category || '') : (item.source || '');
    const freq      = item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1);
    const statusClr = item.active ? '#34a853' : '#ea4335';
    const statusLbl = item.active ? 'Active' : 'Paused';
    const nextDate  = item.nextRun ? new Date(item.nextRun).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
    let monthlyAmt = item.amount;
    if (item.frequency === 'daily') monthlyAmt *= 30;
    else if (item.frequency === 'weekly') monthlyAmt *= 4;

    return `
      <div class="recurring-item">
        <div class="recurring-info">
          <span class="recurring-badge ${item.type}">${item.type === 'expense' ? 'Expense' : 'Income'}</span>
          <strong style="margin-left:10px;">${catOrSrc}</strong>
          <span style="margin-left:8px;color:#888;">${fmt(item.amount)}</span>
          <div class="recurring-meta">
            ${freq} &middot; Next: ${nextDate}
            &middot; ~${fmt(Math.round(monthlyAmt))}/mo
            &middot; <span style="color:${statusClr};font-weight:bold;">${statusLbl}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="filter-btn" onclick="toggleActive('${item.id}')">${item.active ? 'Pause' : 'Resume'}</button>
          <button class="btn-delete" onclick="removeRecurring('${item.id}')">&#x2715;</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Init ───────────────────────────────────────────────────────
document.getElementById('recurStart').value = new Date().toISOString().split('T')[0];
populateCategoryDropdown('recurCategory');
populateAccountDropdown('recurAccount', { allowEmpty: true, placeholder: 'No Account' });
updateCatSrcLabel();
render();
