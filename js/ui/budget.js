// ════════════════════════════════════════════════════════════════
//  BUDGET UI — Rendering & event handling only
// ════════════════════════════════════════════════════════════════

function setBudgetFromForm() {
  const cat    = document.getElementById('budgetCategory').value;
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  if (!cat || !amount || amount <= 0) return;

  setBudget(cat, amount);

  document.getElementById('budgetCategory').value = '';
  document.getElementById('budgetAmount').value   = '';

  showToast('Budget set for ' + cat + '!');
  render();
}

function removeBudgetFromUI(cat) {
  if (!confirm('Remove budget for ' + cat + '?')) return;
  removeBudget(cat);
  render();
}

function render() {
  const now  = new Date();
  const exp  = getMonthlyExpenses(now.getMonth(), now.getFullYear());
  const list = document.getElementById('budgetList');
  const budgets = getAllBudgets();
  const cats = Object.keys(budgets);

  if (cats.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#x1F4CA;</div>
      <div class="empty-state-title">No budgets set yet</div>
      <div class="empty-state-desc">Set category budgets to track spending limits<br>and get warnings when you're close to exceeding them.</div>
      <div class="empty-state-actions">
        <button class="empty-state-action" onclick="document.getElementById('budgetCategory').focus()">&#x2795; Set your first budget</button>
      </div>
    </div>`;
    return;
  }

  list.innerHTML = cats.map(cat => {
    const spent = getTotalAmount(exp.filter(e => e.category === cat));
    const limit = budgets[cat];
    // CSS width only — full precision keeps the bar smooth on resize.
    const pct  = Math.min((spent / limit) * 100, 100);
    const over = spent > limit;

    return `
      <div class="budget-item">
        <div class="budget-header">
          <span class="budget-cat">${cat}</span>
          <span class="budget-amounts ${over ? 'over' : ''}">
            ${fmt(spent)} / ${fmt(limit)}
          </span>
          <button class="btn-delete" onclick="removeBudgetFromUI('${cat}')">&#x2715;</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${over ? 'over' : ''}" style="width:${pct}%"></div>
        </div>
        ${over ? `<p class="budget-alert">&#x26A0; Budget exceeded by ${fmt(spent - limit)}</p>` : ''}
      </div>
    `;
  }).join('');
}

populateCategoryDropdown('budgetCategory');
render();
