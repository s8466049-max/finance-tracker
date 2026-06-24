// ════════════════════════════════════════════════════════════════
//  TRANSACTION SERVICE — Business logic for expenses, income,
//  accounts, lending, recurring. UI should call these, never
//  manipulate data directly.
// ════════════════════════════════════════════════════════════════

// ── Global Refresh Strategy ────────────────────────────────────
function refreshAll() {
  invalidateExpensesCache();
  invalidateIncomeCache();
  invalidateAccountsCache();
  invalidateLendingCache();
  invalidateRecurringCache();
  _unifiedCache = null;
}

// ── Unified Transaction Model ──────────────────────────────────
let _unifiedCache = null;

function getAllTransactions() {
  if (_unifiedCache) return _unifiedCache;

  const expenses = getAllExpenses().map(e => ({
    id: e.id,
    type: 'expense',
    amount: Number(e.amount),
    date: e.date,
    accountId: e.accountId || '',
    createdAt: e.createdAt || e.date,
    category: e.category,
    source: e.source || null,
    recurringId: e.recurringId || null
  }));

  const income = getAllIncome().map(i => ({
    id: i.id,
    type: 'income',
    amount: Number(i.amount),
    date: i.date,
    accountId: i.accountId || '',
    createdAt: i.createdAt || i.date,
    category: i.source,
    source: i.source,
    recurringId: i.recurringId || null
  }));

  const lendings = getAllLendings().flatMap(l => {
    const items = [];
    items.push({
      id: l.id,
      type: 'lending_given',
      amount: Number(l.amountGiven),
      date: l.dateGiven,
      accountId: l.accountId || '',
      createdAt: l.createdAt || l.dateGiven,
      category: 'Lent to ' + l.personName,
      source: null,
      recurringId: null
    });
    (l.payments || []).forEach(p => {
      items.push({
        id: l.id + '_ret_' + (p.createdAt || p.date),
        type: 'lending_return',
        amount: Number(p.amount),
        date: p.date,
        accountId: p.accountId || '',
        createdAt: p.createdAt || p.date,
        category: 'Return from ' + l.personName,
        source: null,
        recurringId: null
      });
    });
    return items;
  });

  _unifiedCache = [...expenses, ...income, ...lendings].sort(sortNewestFirst);
  return _unifiedCache;
}

function invalidateUnifiedCache() {
  _unifiedCache = null;
}

function getMonthlyTransactions(month, year) {
  return getAllTransactions().filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

// ── Undo / Recovery System ─────────────────────────────────────
let _lastAction = null;
let _undoTimer  = null;

function storeUndo(action) {
  _lastAction = action;
  clearTimeout(_undoTimer);
  _undoTimer = setTimeout(() => { _lastAction = null; }, 10000);
}

function performUndo() {
  if (!_lastAction) { showToast('Nothing to undo.'); return false; }
  const action = _lastAction;
  _lastAction = null;
  clearTimeout(_undoTimer);

  try {
    if (action.type === 'delete-expense') {
      const expenses = getAllExpenses();
      expenses.push(action.data);
      saveAllExpenses(expenses);
      if (action.data.accountId) adjustAccountBalance(action.data.accountId, action.data.amount, 'expense');
      invalidateAccountsCache();
    } else if (action.type === 'delete-income') {
      const income = getAllIncome();
      income.push(action.data);
      saveAllIncome(income);
      if (action.data.accountId) adjustAccountBalance(action.data.accountId, action.data.amount, 'income');
      invalidateAccountsCache();
    } else if (action.type === 'delete-lending') {
      const list = getAllLendings();
      list.push(action.data);
      saveAllLendings(list);
    } else if (action.type === 'delete-recurring') {
      const items = getAllRecurring();
      items.push(action.data);
      saveAllRecurring(items);
    } else if (action.type === 'delete-account') {
      const accounts = getAllAccounts();
      accounts.push(action.data);
      saveAllAccounts(accounts);
      invalidateAccountsCache();
    }
    showToast('Action undone.', 'success');
    return true;
  } catch (e) {
    showToast('Undo failed.', 'error');
    return false;
  }
}

function showUndoToast(msg) {
  let toast = document.getElementById('_toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg + ' <button onclick="if(performUndo()){location.reload?location.reload():render()}" style="margin-left:8px;background:none;border:1px solid currentColor;color:inherit;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:0.85em;">Undo</button>';
  toast.className = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 5000);
}

// ── Account Balance Adjustments ────────────────────────────────
function adjustAccountBalance(accountId, amount, txnType) {
  if (!accountId) return;
  const accounts = getAllAccounts();
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return;
  const num = Number(amount);
  if (txnType === 'expense') {
    acc.balance = acc.type === 'credit' ? acc.balance + num : acc.balance - num;
  } else if (txnType === 'income') {
    acc.balance = acc.type === 'credit' ? acc.balance - num : acc.balance + num;
  }
  saveAllAccounts(accounts);
}

function reverseAccountBalance(accountId, amount, txnType) {
  if (!accountId) return;
  adjustAccountBalance(accountId, amount, txnType === 'expense' ? 'income' : 'expense');
}

// ── Expense CRUD ───────────────────────────────────────────────
function createExpense(amount, category, date, accountId, extraFields) {
  const expenses = getAllExpenses();
  const entry = { id: generateId(), amount: Number(amount), category, date, accountId: accountId || '', createdAt: nowTimestamp() };
  if (extraFields) Object.assign(entry, extraFields);
  expenses.push(entry);
  saveAllExpenses(expenses);
  adjustAccountBalance(accountId, amount, 'expense');
  invalidateAccountsCache();
  invalidateUnifiedCache();
  return entry;
}

function updateExpense(id, amount, category, date, accountId) {
  const expenses = getAllExpenses();
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const old = expenses[idx];
  reverseAccountBalance(old.accountId, old.amount, 'expense');
  expenses[idx] = { id, amount: Number(amount), category, date, accountId: accountId || '', createdAt: old.createdAt || nowTimestamp() };
  if (old.recurringId) expenses[idx].recurringId = old.recurringId;
  if (old.source) expenses[idx].source = old.source;
  saveAllExpenses(expenses);
  adjustAccountBalance(accountId, amount, 'expense');
  invalidateAccountsCache();
  invalidateUnifiedCache();
  return expenses[idx];
}

function deleteExpenseById(id) {
  const expenses = getAllExpenses();
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const old = expenses[idx];
  reverseAccountBalance(old.accountId, old.amount, 'expense');
  invalidateAccountsCache();
  expenses.splice(idx, 1);
  saveAllExpenses(expenses);
  invalidateUnifiedCache();
  storeUndo({ type: 'delete-expense', data: old });
  return true;
}

// ── Income CRUD ────────────────────────────────────────────────
function createIncome(amount, source, date, accountId, extraFields) {
  const income = getAllIncome();
  const entry = { id: generateId(), amount: Number(amount), source, date, accountId: accountId || '', createdAt: nowTimestamp() };
  if (extraFields) Object.assign(entry, extraFields);
  income.push(entry);
  saveAllIncome(income);
  adjustAccountBalance(accountId, amount, 'income');
  invalidateAccountsCache();
  invalidateUnifiedCache();
  return entry;
}

function updateIncome(id, amount, source, date, accountId) {
  const income = getAllIncome();
  const idx = income.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const old = income[idx];
  reverseAccountBalance(old.accountId, old.amount, 'income');
  income[idx] = { id, amount: Number(amount), source, date, accountId: accountId || '', createdAt: old.createdAt || nowTimestamp() };
  if (old.recurringId) income[idx].recurringId = old.recurringId;
  saveAllIncome(income);
  adjustAccountBalance(accountId, amount, 'income');
  invalidateAccountsCache();
  invalidateUnifiedCache();
  return income[idx];
}

function deleteIncomeById(id) {
  const income = getAllIncome();
  const idx = income.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const old = income[idx];
  reverseAccountBalance(old.accountId, old.amount, 'income');
  invalidateAccountsCache();
  income.splice(idx, 1);
  saveAllIncome(income);
  invalidateUnifiedCache();
  storeUndo({ type: 'delete-income', data: old });
  return true;
}

// ── Budget Check ───────────────────────────────────────────────
function checkBudget(category) {
  const budgets = getAllBudgets();
  if (!budgets[category]) return;
  const spent = getTotalAmount(
    getMonthlyExpenses(new Date().getMonth(), new Date().getFullYear())
      .filter(e => e.category === category)
  );
  if (spent > budgets[category]) {
    showToast('\u26A0 Budget exceeded for ' + category + '!');
  }
}

// ── Lending System ─────────────────────────────────────────────
function addLending(personName, amountGiven, dateGiven, accountId) {
  const list = getAllLendings();
  const entry = {
    id: generateId(),
    personName,
    amountGiven: Number(amountGiven),
    amountReturned: 0,
    remainingAmount: Number(amountGiven),
    dateGiven,
    status: 'pending',
    payments: [],
    accountId: accountId || '',
    createdAt: nowTimestamp()
  };
  list.push(entry);
  saveAllLendings(list);
  if (accountId) adjustAccountBalance(accountId, amountGiven, 'expense');
  invalidateLendingCache();
  invalidateUnifiedCache();
  return entry;
}

function recordLendingPayment(lendingId, amount, date, accountId) {
  const list = getAllLendings();
  const entry = list.find(l => l.id === lendingId);
  if (!entry) return null;
  const num = Number(amount);
  entry.amountReturned += num;
  entry.remainingAmount = entry.amountGiven - entry.amountReturned;
  if (entry.remainingAmount <= 0) {
    entry.remainingAmount = 0;
    entry.status = 'completed';
  }
  entry.payments.push({ amount: num, date, accountId: accountId || '', createdAt: nowTimestamp() });
  saveAllLendings(list);
  if (accountId) adjustAccountBalance(accountId, num, 'income');
  invalidateLendingCache();
  invalidateUnifiedCache();
  return entry;
}

function deleteLending(id) {
  let list = getAllLendings();
  const entry = list.find(l => l.id === id);
  if (entry) storeUndo({ type: 'delete-lending', data: entry });
  list = list.filter(l => l.id !== id);
  saveAllLendings(list);
  invalidateLendingCache();
  invalidateUnifiedCache();
}

// ── Recurring Processing ───────────────────────────────────────
const RECURRING_LOOP_LIMIT = 366;

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  if (frequency === 'daily')   d.setDate(d.getDate() + 1);
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7);
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

function processRecurring() {
  const today = new Date().toISOString().split('T')[0];
  const lastRun = localStorage.getItem('recurringLastRun');
  if (lastRun === today) return;

  const items = getAllRecurring();
  if (!items.length) {
    localStorage.setItem('recurringLastRun', today);
    return;
  }

  let expChanged = false;
  let incChanged = false;
  let recChanged = false;

  const expenses = getAllExpenses();
  const income   = getAllIncome();
  const firedToday = [];

  items.forEach(item => {
    if (!item.active) return;
    let loopCount = 0;
    while (item.nextRun <= today) {
      if (loopCount >= RECURRING_LOOP_LIMIT) {
        item.nextRun = today;
        break;
      }
      if (item.type === 'expense') {
        expenses.push({ id: generateId(), amount: item.amount, category: item.category, date: item.nextRun, accountId: item.accountId || '', createdAt: new Date(item.nextRun + 'T00:00:00').toISOString(), source: 'recurring', recurringId: item.id });
        expChanged = true;
      } else {
        income.push({ id: generateId(), amount: item.amount, source: item.source || 'Recurring', date: item.nextRun, accountId: item.accountId || '', createdAt: new Date(item.nextRun + 'T00:00:00').toISOString(), recurringSource: 'recurring', recurringId: item.id });
        incChanged = true;
      }
      if (item.nextRun === today) {
        firedToday.push({ label: item.type === 'expense' ? (item.category || 'Expense') : (item.source || 'Income'), amount: item.amount, type: item.type });
      }
      item.nextRun = advanceDate(item.nextRun, item.frequency);
      recChanged = true;
      loopCount++;
    }
  });

  if (expChanged) { saveAllExpenses(expenses); }
  if (incChanged) { saveAllIncome(income); }
  if (recChanged) { saveAllRecurring(items); }

  localStorage.setItem('recurringFiredToday', JSON.stringify(firedToday));
  localStorage.setItem('recurringLastRun', today);
}

// Run recurring check on every page load
(function () { try { processRecurring(); } catch (ignored) {} })();

// ── Account CRUD ───────────────────────────────────────────────
function createAccount(name, type, balance, billingDay, dueDay) {
  const accounts = getAllAccounts();
  const acc = { id: generateId(), name, type, balance: Number(balance) || 0 };
  if (type === 'credit') {
    acc.billingDay = billingDay || 1;
    acc.dueDay     = dueDay || 15;
  }
  accounts.push(acc);
  saveAllAccounts(accounts);
  invalidateAccountsCache();
  return acc;
}

function updateAccount(id, name, type, balance, billingDay, dueDay) {
  const accounts = getAllAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return null;
  const acc = { id, name, type, balance: Number(balance) || 0 };
  if (type === 'credit') {
    acc.billingDay = billingDay || 1;
    acc.dueDay     = dueDay || 15;
  }
  accounts[idx] = acc;
  saveAllAccounts(accounts);
  invalidateAccountsCache();
  return acc;
}

function getLinkedTransactionCount(accountId) {
  const expCount = getAllExpenses().filter(e => e.accountId === accountId).length;
  const incCount = getAllIncome().filter(i => i.accountId === accountId).length;
  const lendCount = getAllLendings().filter(l => l.accountId === accountId).length;
  return { expenses: expCount, income: incCount, lending: lendCount, total: expCount + incCount + lendCount };
}

function deleteAccountById(id) {
  const accounts = getAllAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  const old = accounts[idx];

  // Clear account reference from linked transactions (graceful degradation)
  const expenses = getAllExpenses();
  let expChanged = false;
  expenses.forEach(e => {
    if (e.accountId === id) { e.accountId = ''; expChanged = true; }
  });
  if (expChanged) saveAllExpenses(expenses);

  const income = getAllIncome();
  let incChanged = false;
  income.forEach(i => {
    if (i.accountId === id) { i.accountId = ''; incChanged = true; }
  });
  if (incChanged) saveAllIncome(income);

  // Clear from recurring templates
  const recurring = getAllRecurring();
  let recChanged = false;
  recurring.forEach(r => {
    if (r.accountId === id) { r.accountId = ''; recChanged = true; }
  });
  if (recChanged) saveAllRecurring(recurring);

  accounts.splice(idx, 1);
  saveAllAccounts(accounts);
  invalidateAccountsCache();
  invalidateUnifiedCache();
  storeUndo({ type: 'delete-account', data: old });
  return true;
}

// ── Recurring CRUD ─────────────────────────────────────────────
function createRecurring(item) {
  const items = getAllRecurring();
  item.id        = generateId();
  item.active    = true;
  item.createdAt = nowTimestamp();
  items.push(item);
  saveAllRecurring(items);
  return item;
}

function deleteRecurringById(id) {
  const items = getAllRecurring();
  const idx = items.findIndex(r => r.id === id);
  if (idx === -1) return false;
  const old = items[idx];
  items.splice(idx, 1);
  saveAllRecurring(items);
  storeUndo({ type: 'delete-recurring', data: old });
  return true;
}

function toggleRecurringActive(id) {
  const items = getAllRecurring();
  const item = items.find(r => r.id === id);
  if (!item) return null;
  item.active = !item.active;
  saveAllRecurring(items);
  return item;
}

// ── Budget CRUD ────────────────────────────────────────────────
function setBudget(category, amount) {
  const budgets = getAllBudgets();
  budgets[category] = amount;
  saveAllBudgets(budgets);
}

function removeBudget(category) {
  const budgets = getAllBudgets();
  delete budgets[category];
  saveAllBudgets(budgets);
}
