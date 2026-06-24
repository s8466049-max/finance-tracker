// ════════════════════════════════════════════════════════════════
//  DATA SERVICE — All localStorage access in one place
//  ONLY this file reads/writes localStorage (except dark mode in utils)
// ════════════════════════════════════════════════════════════════

// ── Raw Storage Access ─────────────────────────────────────────
function getData(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDataObj(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    showToast('Failed to save data. Storage may be full.', 'error');
    console.error('setData error:', key, e);
  }
}

// ── App Version Init ───────────────────────────────────────────
(function initVersion() {
  if (!localStorage.getItem('app_version')) {
    localStorage.setItem('app_version', APP_VERSION);
  }
})();

// ── In-Memory Caches ───────────────────────────────────────────
let _expensesCache     = null;
let _incomeCache       = null;
let _recurringCache    = null;
let _accountsCache     = null;
let _lendingCache      = null;
let _investmentsCache  = null;
let _fdCache           = null;
let _rdCache           = null;

function invalidateExpensesCache()    { _expensesCache    = null; }
function invalidateIncomeCache()      { _incomeCache      = null; }
function invalidateRecurringCache()   { _recurringCache   = null; }
function invalidateAccountsCache()    { _accountsCache    = null; }
function invalidateLendingCache()     { _lendingCache     = null; }
function invalidateInvestmentsCache() { _investmentsCache = null; }
function invalidateFDCache()          { _fdCache          = null; }
function invalidateRDCache()          { _rdCache          = null; }

// ── Expenses ───────────────────────────────────────────────────
function getAllExpenses() {
  if (_expensesCache) return _expensesCache;
  const data = getData('expenses');
  let changed = false;
  data.forEach(e => {
    if (!e.id) { e.id = generateId(); changed = true; }
    if (!e.createdAt) { e.createdAt = e.date ? new Date(e.date).toISOString() : nowTimestamp(); changed = true; }
    if (!e.accountId && e.accountId !== '') { e.accountId = ''; changed = true; }
  });
  if (changed) setData('expenses', data);
  _expensesCache = data;
  return _expensesCache;
}

function saveAllExpenses(expenses) {
  setData('expenses', expenses);
  invalidateExpensesCache();
}

// ── Income ─────────────────────────────────────────────────────
function getAllIncome() {
  if (_incomeCache) return _incomeCache;
  const data = getData('income');
  let changed = false;
  data.forEach(e => {
    if (!e.id) { e.id = generateId(); changed = true; }
    if (!e.createdAt) { e.createdAt = e.date ? new Date(e.date).toISOString() : nowTimestamp(); changed = true; }
    if (!e.accountId && e.accountId !== '') { e.accountId = ''; changed = true; }
  });
  if (changed) setData('income', data);
  _incomeCache = data;
  return _incomeCache;
}

function saveAllIncome(income) {
  setData('income', income);
  invalidateIncomeCache();
}

// ── Monthly Accessors ──────────────────────────────────────────
function getMonthlyExpenses(month, year) {
  return getAllExpenses().filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function getMonthlyIncome(month, year) {
  return getAllIncome().filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

// ── Accounts ───────────────────────────────────────────────────
function getAllAccounts() {
  if (_accountsCache) return _accountsCache;
  _accountsCache = getDataObj('accounts_list', []);
  return _accountsCache;
}

function saveAllAccounts(accounts) {
  setData('accounts_list', accounts);
  _accountsCache = accounts;
}

function getAccountById(id) {
  return getAllAccounts().find(a => a.id === id) || null;
}

function getAccountName(id) {
  if (!id) return '—';
  const acc = getAccountById(id);
  return acc ? acc.name : '(Deleted Account)';
}

// ── Investments ───────────────────────────────────────────────
function getAllInvestments() {
  if (_investmentsCache) return _investmentsCache;
  _investmentsCache = getDataObj('investments_list', []);
  return _investmentsCache;
}

function saveAllInvestments(list) {
  setData('investments_list', list);
  _investmentsCache = list;
}

function getInvestmentById(id) {
  return getAllInvestments().find(i => i.id === id) || null;
}

// ── Fixed Deposits ─────────────────────────────────────────────
function getAllFDs() {
  if (_fdCache) return _fdCache;
  _fdCache = getDataObj('fd_list', []);
  return _fdCache;
}

function saveAllFDs(list) {
  setData('fd_list', list);
  _fdCache = list;
}

function getFDById(id) {
  return getAllFDs().find(f => f.id === id) || null;
}

// ── Recurring Deposits ──────────────────────────────────────────
function getAllRDs() {
  if (_rdCache) return _rdCache;
  _rdCache = getDataObj('rd_list', []);
  return _rdCache;
}

function saveAllRDs(list) {
  setData('rd_list', list);
  _rdCache = list;
}

function getRDById(id) {
  return getAllRDs().find(r => r.id === id) || null;
}

// ── Lending ────────────────────────────────────────────────────
function getAllLendings() {
  if (_lendingCache) return _lendingCache;
  _lendingCache = getDataObj('lending_list', []);
  return _lendingCache;
}

function saveAllLendings(list) {
  setData('lending_list', list);
  _lendingCache = list;
}

function getLendingById(id) {
  return getAllLendings().find(l => l.id === id) || null;
}

// ── Recurring ──────────────────────────────────────────────────
function getAllRecurring() {
  if (_recurringCache) return _recurringCache;
  try {
    _recurringCache = JSON.parse(localStorage.getItem('recurring')) || [];
  } catch {
    _recurringCache = [];
  }
  return _recurringCache;
}

function saveAllRecurring(items) {
  setData('recurring', items);
  invalidateRecurringCache();
}

// ── Budgets ────────────────────────────────────────────────────
function getAllBudgets() {
  return getDataObj('budgets', {});
}

function saveAllBudgets(budgets) {
  setData('budgets', budgets);
}

// ── Balance Aggregations ───────────────────────────────────────
function getTotalByAccountType(type) {
  return getAllAccounts().filter(a => a.type === type).reduce((s, a) => s + Number(a.balance), 0);
}

function parseStoredDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatStoredDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsToStoredDate(dateStr, months) {
  const start = parseStoredDate(dateStr);
  const offset = Number(months || 0);
  if (!start || !Number.isFinite(offset)) return '';
  return formatStoredDate(new Date(start.getFullYear(), start.getMonth() + offset, start.getDate()));
}

function getDaysUntilDate(dateStr, asOf) {
  const target = parseStoredDate(dateStr);
  if (!target) return null;
  const base = asOf instanceof Date ? asOf : new Date();
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const due = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

function getElapsedInstallments(startDate, tenure, asOf) {
  const start = parseStoredDate(startDate);
  const totalMonths = Math.max(0, Number(tenure || 0));
  if (!start || totalMonths <= 0) return 0;

  const base = asOf instanceof Date ? asOf : new Date();
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (today < start) return 0;

  let diffMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) diffMonths -= 1;
  const installments = Math.max(0, diffMonths) + 1;
  return Math.min(totalMonths, installments);
}

function calculateFDMaturityValue(fd) {
  const amount = Number(fd && fd.amount || 0);
  const rate = Number(fd && fd.rate || 0);
  const tenure = Number(fd && fd.tenure || 0);
  if (fd && (fd.interestType === 'Compound' || (fd.compoundInterest && !fd.interestType))) {
    return amount * Math.pow(1 + rate / (100 * 4), 4 * (tenure / 12));
  }
  return amount * (1 + (rate * tenure) / (100 * 12));
}

function calculateFDInterestEarned(fd) {
  return calculateFDMaturityValue(fd) - Number(fd && fd.amount || 0);
}

function calculateFDEffectiveYield(fd) {
  const amount = Number(fd && fd.amount || 0);
  const tenure = Number(fd && fd.tenure || 0);
  const maturity = calculateFDMaturityValue(fd);
  if (amount <= 0 || tenure <= 0 || maturity <= 0) return 0;
  return (Math.pow(maturity / amount, 12 / tenure) - 1) * 100;
}

function getFDMaturityDate(fd) {
  return (fd && fd.maturityDate) || addMonthsToStoredDate(fd && fd.startDate, fd && fd.tenure);
}

function getFDStatus(fd, asOf) {
  if (fd && fd.status === 'Closed') return 'Closed';
  const daysRemaining = getDaysUntilDate(getFDMaturityDate(fd), asOf);
  return daysRemaining != null && daysRemaining <= 0 ? 'Matured' : 'Active';
}

function calculateRDTotalInvested(rd) {
  return Number(rd && rd.monthlyDeposit || 0) * Number(rd && rd.tenure || 0);
}

function calculateRDMaturityValue(rd) {
  const monthly = Number(rd && rd.monthlyDeposit || 0);
  const rate = Number(rd && rd.rate || 0);
  const tenure = Number(rd && rd.tenure || 0);
  return monthly * tenure * (1 + (rate * (tenure + 1)) / (2 * 12 * 100));
}

function calculateRDInterestEarned(rd) {
  return calculateRDMaturityValue(rd) - calculateRDTotalInvested(rd);
}

function getRDMaturityDate(rd) {
  return addMonthsToStoredDate(rd && rd.startDate, rd && rd.tenure);
}

function getRDStatus(rd, asOf) {
  if (rd && rd.status === 'Closed') return 'Closed';
  const daysRemaining = getDaysUntilDate(getRDMaturityDate(rd), asOf);
  return daysRemaining != null && daysRemaining <= 0 ? 'Matured' : 'Active';
}

function calculateRDDepositedTillDate(rd, asOf) {
  const monthly = Number(rd && rd.monthlyDeposit || 0);
  const installments = getElapsedInstallments(rd && rd.startDate, rd && rd.tenure, asOf);
  return monthly * installments;
}

function calculateRDMonthsRemaining(rd, asOf) {
  const tenure = Number(rd && rd.tenure || 0);
  return Math.max(0, tenure - getElapsedInstallments(rd && rd.startDate, tenure, asOf));
}

function isUpcomingSIP(investment, asOf) {
  const today = asOf instanceof Date ? asOf : new Date();
  const sipAmount = Number(investment && investment.sipAmount || 0);
  const sipDay = Number(investment && investment.sipDay || 0);
  if (!sipAmount || sipAmount <= 0 || !sipDay || sipDay < 1 || sipDay > 31) return false;
  const nextSIPDate = new Date(today.getFullYear(), today.getMonth(), sipDay);
  if (nextSIPDate < today) {
    nextSIPDate.setMonth(nextSIPDate.getMonth() + 1);
  }
  const daysUntil = Math.ceil((nextSIPDate - today) / (24 * 60 * 60 * 1000));
  return daysUntil >= 0 && daysUntil <= 30;
}

function getDaysUntilNextSIP(investment, asOf) {
  const today = asOf instanceof Date ? asOf : new Date();
  const sipDay = Number(investment && investment.sipDay || 0);
  if (sipDay < 1 || sipDay > 31) return null;
  const nextSIPDate = new Date(today.getFullYear(), today.getMonth(), sipDay);
  if (nextSIPDate < today) {
    nextSIPDate.setMonth(nextSIPDate.getMonth() + 1);
  }
  return Math.ceil((nextSIPDate - today) / (24 * 60 * 60 * 1000));
}

function getTotalInvestmentCurrentValue() {
  const mfValue = getAllInvestments().reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0);
  const fdValue = getAllFDs().reduce((sum, fd) => sum + calculateFDMaturityValue(fd), 0);
  const rdValue = getAllRDs().reduce((sum, rd) => sum + calculateRDMaturityValue(rd), 0);
  return mfValue + fdValue + rdValue;
}

function getTotalInvestmentInvestedValue() {
  const mfInvested = getAllInvestments().reduce((sum, investment) => sum + Number(investment.investedAmount || 0), 0);
  const fdInvested = getAllFDs().reduce((sum, fd) => sum + Number(fd.amount || 0), 0);
  const rdInvested = getAllRDs().reduce((sum, rd) => sum + calculateRDTotalInvested(rd), 0);
  return mfInvested + fdInvested + rdInvested;
}

function getAvailableBalance() {
  const list = getDataObj('accounts_list', null);
  if (list && list.length) {
    return getTotalByAccountType('bank') + getTotalByAccountType('cash');
  }
  const acct = getDataObj('accounts', { savings: 0, creditCard: 0, cash: 0 });
  return (acct.savings || 0) + (acct.cash || 0) - (acct.creditCard || 0);
}

function getComputedBalance() {
  return getTotalAmount(getAllIncome()) - getTotalAmount(getAllExpenses());
}

function getNetWorth() {
  const totalInvestmentValue = getTotalInvestmentCurrentValue();
  const list = getDataObj('accounts_list', null);
  if (list && list.length) {
    return getTotalByAccountType('bank') + getTotalByAccountType('cash') + totalInvestmentValue - getTotalByAccountType('credit');
  }
  const acct = getDataObj('accounts', { savings: 0, creditCard: 0, cash: 0 });
  const balances = (acct.savings || 0) + (acct.cash || 0) - (acct.creditCard || 0);
  const net = getTotalAmount(getAllIncome()) - getTotalAmount(getAllExpenses());
  return balances + net + totalInvestmentValue;
}

function getTotalLendingPending() {
  return getAllLendings()
    .filter(l => l.status === 'pending')
    .reduce((s, l) => s + l.remainingAmount, 0);
}

function getCCMonthlySpend(accountId, month, year) {
  return getMonthlyExpenses(month, year).filter(e => e.accountId === accountId);
}

// ── Account Selection Helpers ──────────────────────────────────
function getLastUsedAccount(pageKey) {
  try {
    return localStorage.getItem('lastAccount_' + pageKey) || '';
  } catch { return ''; }
}

function setLastUsedAccount(pageKey, accountId) {
  try {
    localStorage.setItem('lastAccount_' + pageKey, accountId);
  } catch { /* ignore */ }
}

function getDefaultAccountId(pageKey) {
  const lastUsed = getLastUsedAccount(pageKey);
  if (lastUsed && getAccountById(lastUsed)) return lastUsed;
  const accounts = getAllAccounts();
  const firstCC = accounts.find(a => a.type === 'credit');
  if (firstCC) return firstCC.id;
  return '';
}

// ── Quick Add Presets ──────────────────────────────────────────
const DEFAULT_QUICK_PRESETS = [
  { label: 'Food',   amount: 100, category: 'Food'   },
  { label: 'Tea',    amount: 50,  category: 'Food'   },
  { label: 'Travel', amount: 200, category: 'Travel' }
];

function getQuickPresets() {
  try {
    const saved = JSON.parse(localStorage.getItem('quickAddPresets'));
    return Array.isArray(saved) ? saved : DEFAULT_QUICK_PRESETS;
  } catch {
    return DEFAULT_QUICK_PRESETS;
  }
}

function saveQuickPresets(presets) {
  localStorage.setItem('quickAddPresets', JSON.stringify(presets));
}

// ── Export / Import ────────────────────────────────────────────
function eraseAllData() {
  const confirmed = confirm(
    'This will permanently erase all finance data on this device.\n\n' +
    'This includes expenses, income, accounts, budgets, lending, recurring items, investments, and snapshots.\n\n' +
    'Do you want to continue?'
  );
  if (!confirmed) return;

  const keysToRemove = [
    'accounts',
    'accounts_list',
    'expenses',
    'income',
    'budgets',
    'lending_list',
    'recurring',
    'investments_list',
    'fd_list',
    'rd_list',
    'portfolio_snapshots',
    'quickAddPresets',
    'incomeQuickPresets',
    'recurringFiredToday',
    'recurringLastRun',
    'backup_pre_import',
    'app_version'
  ];

  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Remove dynamic per-page account preference keys.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lastAccount_')) {
      localStorage.removeItem(key);
    }
  }

  invalidateExpensesCache();
  invalidateIncomeCache();
  invalidateRecurringCache();
  invalidateAccountsCache();
  invalidateLendingCache();
  invalidateInvestmentsCache();
  invalidateFDCache();
  invalidateRDCache();

  showToast('All data erased. Reloading...', 'success');
  setTimeout(() => location.reload(), 700);
}

function exportData() {
  const data = {
    version: APP_VERSION,
    exportedAt: nowTimestamp(),
    expenses:         getData('expenses'),
    income:           getData('income'),
    accounts:         getDataObj('accounts', {}),
    accounts_list:    getDataObj('accounts_list', []),
    budgets:          getDataObj('budgets', {}),
    recurring:        getData('recurring'),
    lending_list:     getDataObj('lending_list', []),
    investments_list: getDataObj('investments_list', []),
    fd_list:          getDataObj('fd_list', []),
    rd_list:          getDataObj('rd_list', [])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finance-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const expenses = getData('expenses');
  const income   = getData('income');
  let csv = 'Type,Date,Category/Source,Amount,Account\n';
  expenses.forEach(e => {
    csv += `Expense,${e.date},"${(e.category || '').replace(/"/g, '""')}",${e.amount},"${(e.accountId || '').replace(/"/g, '""')}"\n`;
  });
  income.forEach(i => {
    csv += `Income,${i.date},"${(i.source || '').replace(/"/g, '""')}",${i.amount},"${(i.accountId || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finance-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSVFile(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Download Queue System ──────────────────────────────────────
let _downloadQueue = [];
let _isDownloading = false;

function addToDownloadQueue(filename, csvContent) {
  _downloadQueue.push({ filename, csvContent });
}

function processDownloadQueue() {
  if (_isDownloading || _downloadQueue.length === 0) return;
  _isDownloading = true;
  
  const { filename, csvContent } = _downloadQueue.shift();
  downloadCSVFile(filename, csvContent);
  
  // Process next file after delay to prevent browser blocking
  setTimeout(() => {
    _isDownloading = false;
    processDownloadQueue();
  }, 800);
}

function exportSeparateCSV() {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  _downloadQueue = [];
  _isDownloading = false;
  
  // ── EXPENSES CSV ───────────────────────────────────────────
  const expenses = getData('expenses');
  let expensesCsv = 'Date,Category,Amount,Account,Description,ID\n';
  expenses.forEach(e => {
    const accountName = getAccountName(e.accountId);
    const description = e.description || '';
    expensesCsv += `"${e.date}","${(e.category || '').replace(/"/g, '""')}","${e.amount}","${accountName.replace(/"/g, '""')}","${description.replace(/"/g, '""')}","${e.id}"\n`;
  });
  addToDownloadQueue(`expenses_${timestamp}.csv`, expensesCsv);
  
  // ── INCOME CSV ────────────────────────────────────────────
  const income = getData('income');
  let incomeCsv = 'Date,Source,Amount,Account,Description,ID\n';
  income.forEach(i => {
    const accountName = getAccountName(i.accountId);
    const description = i.description || '';
    incomeCsv += `"${i.date}","${(i.source || '').replace(/"/g, '""')}","${i.amount}","${accountName.replace(/"/g, '""')}","${description.replace(/"/g, '""')}","${i.id}"\n`;
  });
  addToDownloadQueue(`income_${timestamp}.csv`, incomeCsv);
  
  // ── ACCOUNTS/BANK BALANCES CSV ────────────────────────────
  const accounts = getAllAccounts();
  let accountsCsv = 'Account Name,Type,Balance,Account ID\n';
  accounts.forEach(a => {
    const balance = a.balance || 0;
    accountsCsv += `"${(a.name || '').replace(/"/g, '""')}","${a.type}","${balance}","${a.id}"\n`;
  });
  addToDownloadQueue(`accounts_${timestamp}.csv`, accountsCsv);
  
  // ── LENDING CSV ────────────────────────────────────────────
  const lendings = getAllLendings();
  let lendingCsv = 'Person Name,Amount Given,Amount Returned,Remaining Amount,Status,Date Given,Account,Payments Count,ID\n';
  lendings.forEach(l => {
    const accountName = getAccountName(l.accountId);
    const paymentsCount = (l.payments || []).length;
    lendingCsv += `"${(l.personName || '').replace(/"/g, '""')}","${l.amountGiven}","${l.amountReturned}","${l.remainingAmount}","${l.status}","${l.dateGiven}","${accountName.replace(/"/g, '""')}","${paymentsCount}","${l.id}"\n`;
  });
  addToDownloadQueue(`lending_${timestamp}.csv`, lendingCsv);
  
  // ── RECURRING CSV ──────────────────────────────────────────
  const recurring = getAllRecurring();
  let recurringCsv = 'Type,Category/Source,Amount,Frequency,Next Date,Account,Description,ID\n';
  recurring.forEach(r => {
    const accountName = getAccountName(r.accountId);
    const description = r.description || '';
    const categoryOrSource = r.type === 'expense' ? (r.category || '') : (r.source || '');
    recurringCsv += `"${r.type}","${categoryOrSource.replace(/"/g, '""')}","${r.amount}","${r.frequency}","${r.nextDate}","${accountName.replace(/"/g, '""')}","${description.replace(/"/g, '""')}","${r.id}"\n`;
  });
  addToDownloadQueue(`recurring_${timestamp}.csv`, recurringCsv);

  // ── INVESTMENTS CSV ────────────────────────────────────────
  const investments = getAllInvestments();
  let investmentsCsv = 'Fund Name,Fund Type,Invested Amount,Current Value,Gain/Loss,Return %,Units,Date,Notes,ID\n';
  investments.forEach(inv => {
    const invested = Number(inv.investedAmount || 0);
    const current  = Number(inv.currentValue   || 0);
    const gain     = current - invested;
    const ret      = invested > 0 ? ((gain / invested) * 100).toFixed(2) : '0.00';
    investmentsCsv += `"${(inv.fundName || '').replace(/"/g, '""')}","${(inv.fundType || '').replace(/"/g, '""')}","${invested}","${current}","${gain}","${ret}","${inv.units || 0}","${inv.date || ''}","${(inv.notes || '').replace(/"/g, '""')}","${inv.id}"\n`;
  });
  if (investments.length > 0) addToDownloadQueue(`investments_${timestamp}.csv`, investmentsCsv);

  // ── FIXED DEPOSITS CSV ────────────────────────────────────────
  const fds = getAllFDs();
  let fdsCsv = 'Bank Name,Amount,Interest Rate,Start Date,Maturity Date,Maturity Value,Interest Earned,Status,Notes,ID\n';
  fds.forEach(fd => {
    const amount     = Number(fd.amount || 0);
    const rate       = Number(fd.rate || 0);
    const daysTotal  = fd.tenure ? fd.tenure * 30 : 365; // Assuming ~30 days per month
    const maturity   = fd.compoundInterest 
      ? amount * Math.pow(1 + rate / (100 * 4), 4 * (fd.tenure ? fd.tenure / 12 : 1))
      : amount * (1 + (rate * daysTotal) / (100 * 365));
    const interest   = maturity - amount;
    fdsCsv += `"${(fd.bankName || '').replace(/"/g, '""')}","${amount}","${rate}","${fd.startDate || ''}","${fd.maturityDate || ''}","${maturity.toFixed(2)}","${interest.toFixed(2)}","${fd.status || 'Active'}","${(fd.notes || '').replace(/"/g, '""')}","${fd.id}"\n`;
  });
  if (fds.length > 0) addToDownloadQueue(`fixedDeposits_${timestamp}.csv`, fdsCsv);

  // ── RECURRING DEPOSITS CSV ──────────────────────────────────────
  const rds = getAllRDs();
  let rdsCsv = 'Bank Name,Monthly Deposit,Interest Rate,Tenure (Months),Start Date,Total Invested,Maturity Value,Interest Earned,Notes,ID\n';
  rds.forEach(rd => {
    const monthly    = Number(rd.monthlyDeposit || 0);
    const rate       = Number(rd.rate || 0);
    const tenure     = Number(rd.tenure || 12);
    const invested   = monthly * tenure;
    const maturity   = monthly * tenure * (1 + (rate * (tenure + 1)) / (2 * 12 * 100));
    const interest   = maturity - invested;
    rdsCsv += `"${(rd.bankName || '').replace(/"/g, '""')}","${monthly}","${rate}","${tenure}","${rd.startDate || ''}","${invested}","${maturity.toFixed(2)}","${interest.toFixed(2)}","${(rd.notes || '').replace(/"/g, '""')}","${rd.id}"\n`;
  });
  if (rds.length > 0) addToDownloadQueue(`recurringDeposits_${timestamp}.csv`, rdsCsv);
  showToast(`Downloading ${totalFiles} CSV files...`, 'info');
  processDownloadQueue();
}

function importData() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json,.csv';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileType = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    const reader = new FileReader();
    
    reader.onload = function (evt) {
      try {
        if (fileType === 'json') {
          handleJsonImport(evt.target.result);
        } else {
          handleCsvImport(file.name, evt.target.result);
        }
      } catch (err) {
        showToast('Invalid file format.', 'error');
        console.error('Import error:', err);
      }
    };
    
    reader.readAsText(file);
  };
  input.click();
}

// ── CSV PARSING UTILITIES ──────────────────────────────────────
function parseCSVLine(line) {
  // Handle quoted fields with escaped quotes
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.trim());
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    return row;
  });
  
  return { headers, rows };
}

// ── CSV IMPORT HANDLERS ────────────────────────────────────────
function importExpensesCSV(rows) {
  const expenses = rows.map(row => ({
    id: row['ID'] || generateId(),
    date: row['Date'] || new Date().toISOString().split('T')[0],
    category: row['Category'] || '',
    amount: Number(row['Amount']) || 0,
    accountId: row['Account ID'] ? findAccountByName(row['Account']) : '',
    description: row['Description'] || '',
    createdAt: new Date().toISOString()
  }));
  
  if (expenses.length === 0) {
    showToast('No valid expenses found in CSV.', 'warning');
    return false;
  }
  
  setData('expenses', expenses);
  showToast(`✓ Imported ${expenses.length} expenses`, 'success');
  return true;
}

function importIncomeCSV(rows) {
  const income = rows.map(row => ({
    id: row['ID'] || generateId(),
    date: row['Date'] || new Date().toISOString().split('T')[0],
    source: row['Source'] || '',
    amount: Number(row['Amount']) || 0,
    accountId: row['Account ID'] ? findAccountByName(row['Account']) : '',
    description: row['Description'] || '',
    createdAt: new Date().toISOString()
  }));
  
  if (income.length === 0) {
    showToast('No valid income found in CSV.', 'warning');
    return false;
  }
  
  setData('income', income);
  showToast(`✓ Imported ${income.length} income entries`, 'success');
  return true;
}

function importAccountsCSV(rows) {
  const accounts = rows.map(row => ({
    id: row['Account ID'] || generateId(),
    name: row['Account Name'] || 'Unknown Account',
    type: row['Type'] || 'bank',
    balance: Number(row['Balance']) || 0
  }));
  
  if (accounts.length === 0) {
    showToast('No valid accounts found in CSV.', 'warning');
    return false;
  }
  
  setData('accounts_list', accounts);
  invalidateAccountsCache();
  showToast(`✓ Imported ${accounts.length} accounts`, 'success');
  return true;
}

function importLendingCSV(rows) {
  const lendings = rows.map(row => ({
    id: row['ID'] || generateId(),
    personName: row['Person Name'] || '',
    amountGiven: Number(row['Amount Given']) || 0,
    amountReturned: Number(row['Amount Returned']) || 0,
    remainingAmount: Number(row['Remaining Amount']) || 0,
    status: row['Status'] || 'pending',
    dateGiven: row['Date Given'] || new Date().toISOString().split('T')[0],
    accountId: findAccountByName(row['Account']) || '',
    payments: [],
    createdAt: new Date().toISOString()
  }));
  
  if (lendings.length === 0) {
    showToast('No valid lending records found in CSV.', 'warning');
    return false;
  }
  
  setData('lending_list', lendings);
  invalidateLendingCache();
  showToast(`✓ Imported ${lendings.length} lending records`, 'success');
  return true;
}

function importRecurringCSV(rows) {
  const recurring = rows.map(row => ({
    id: row['ID'] || generateId(),
    type: row['Type'] || 'expense',
    category: row['Type'] === 'expense' ? row['Category/Source'] : '',
    source: row['Type'] === 'income' ? row['Category/Source'] : '',
    amount: Number(row['Amount']) || 0,
    frequency: row['Frequency'] || 'monthly',
    nextDate: row['Next Date'] || new Date().toISOString().split('T')[0],
    accountId: findAccountByName(row['Account']) || '',
    description: row['Description'] || '',
    createdAt: new Date().toISOString()
  }));
  
  if (recurring.length === 0) {
    showToast('No valid recurring records found in CSV.', 'warning');
    return false;
  }
  
  setData('recurring', recurring);
  invalidateRecurringCache();
  showToast(`✓ Imported ${recurring.length} recurring records`, 'success');
  return true;
}

function findAccountByName(accountName) {
  if (!accountName) return '';
  const accounts = getAllAccounts();
  const found = accounts.find(a => a.name === accountName || a.name === (accountName || '').trim());
  return found ? found.id : '';
}

function handleCsvImport(filename, csvContent) {
  const filenameLC = filename.toLowerCase();
  
  if (filenameLC.includes('expense')) {
    const { rows } = parseCSV(csvContent);
    if (rows.length > 0) {
      const backup = {
        expenses:      getData('expenses'),
        income:        getData('income'),
        accounts:      getDataObj('accounts', {}),
        accounts_list: getDataObj('accounts_list', []),
        budgets:       getDataObj('budgets', {}),
        recurring:     getData('recurring'),
        lending_list:  getDataObj('lending_list', [])
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      importExpensesCSV(rows);
      showToast('Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  } else if (filenameLC.includes('income')) {
    const { rows } = parseCSV(csvContent);
    if (rows.length > 0) {
      const backup = {
        expenses:      getData('expenses'),
        income:        getData('income'),
        accounts:      getDataObj('accounts', {}),
        accounts_list: getDataObj('accounts_list', []),
        budgets:       getDataObj('budgets', {}),
        recurring:     getData('recurring'),
        lending_list:  getDataObj('lending_list', [])
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      importIncomeCSV(rows);
      showToast('Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  } else if (filenameLC.includes('account')) {
    const { rows } = parseCSV(csvContent);
    if (rows.length > 0) {
      const backup = {
        expenses:      getData('expenses'),
        income:        getData('income'),
        accounts:      getDataObj('accounts', {}),
        accounts_list: getDataObj('accounts_list', []),
        budgets:       getDataObj('budgets', {}),
        recurring:     getData('recurring'),
        lending_list:  getDataObj('lending_list', [])
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      importAccountsCSV(rows);
      showToast('Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  } else if (filenameLC.includes('lending')) {
    const { rows } = parseCSV(csvContent);
    if (rows.length > 0) {
      const backup = {
        expenses:      getData('expenses'),
        income:        getData('income'),
        accounts:      getDataObj('accounts', {}),
        accounts_list: getDataObj('accounts_list', []),
        budgets:       getDataObj('budgets', {}),
        recurring:     getData('recurring'),
        lending_list:  getDataObj('lending_list', [])
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      importLendingCSV(rows);
      showToast('Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  } else if (filenameLC.includes('recurring')) {
    const { rows } = parseCSV(csvContent);
    if (rows.length > 0) {
      const backup = {
        expenses:      getData('expenses'),
        income:        getData('income'),
        accounts:      getDataObj('accounts', {}),
        accounts_list: getDataObj('accounts_list', []),
        budgets:       getDataObj('budgets', {}),
        recurring:     getData('recurring'),
        lending_list:  getDataObj('lending_list', [])
      };
      localStorage.setItem('backup_pre_import', JSON.stringify(backup));
      importRecurringCSV(rows);
      showToast('Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  } else {
    showToast('CSV filename not recognized. Use: expenses_*.csv, income_*.csv, accounts_*.csv, lending_*.csv, or recurring_*.csv', 'error');
  }
}

function handleJsonImport(jsonContent) {
  const data = JSON.parse(jsonContent);

  // ── Version check & migration ──────────────────────────
  const importVersion = data.version || '0.9';
  if (parseFloat(importVersion) > parseFloat(APP_VERSION)) {
    showToast('This backup is from a newer app version (' + importVersion + '). Please update the app first.', 'error');
    return;
  }

  if (data.expenses !== undefined && !Array.isArray(data.expenses)) {
    showToast('Invalid file: expenses must be an array.', 'error'); return;
  }
  if (data.income !== undefined && !Array.isArray(data.income)) {
    showToast('Invalid file: income must be an array.', 'error'); return;
  }
  if (data.expenses === undefined && data.income === undefined && data.accounts === undefined && data.budgets === undefined) {
    showToast('Invalid file: no recognisable data found.', 'error'); return;
  }

  if (Array.isArray(data.expenses)) {
    for (const entry of data.expenses) {
      if (typeof entry !== 'object' || entry === null) {
        showToast('Invalid file: malformed expense entry.', 'error'); return;
      }
      if (entry.amount === undefined || isNaN(Number(entry.amount))) {
        showToast('Invalid file: expense has invalid amount.', 'error'); return;
      }
      if (!entry.date || isNaN(Date.parse(entry.date))) {
        showToast('Invalid file: expense has invalid date.', 'error'); return;
      }
    }
  }

  if (Array.isArray(data.income)) {
    for (const entry of data.income) {
      if (typeof entry !== 'object' || entry === null) {
        showToast('Invalid file: malformed income entry.', 'error'); return;
      }
      if (entry.amount === undefined || isNaN(Number(entry.amount))) {
        showToast('Invalid file: income has invalid amount.', 'error'); return;
      }
      if (!entry.date || isNaN(Date.parse(entry.date))) {
        showToast('Invalid file: income has invalid date.', 'error'); return;
      }
    }
  }

  if (data.accounts !== undefined) {
    if (typeof data.accounts !== 'object' || data.accounts === null || Array.isArray(data.accounts)) {
      showToast('Invalid file: accounts must be an object.', 'error'); return;
    }
  }

  const backup = {
    expenses:      getData('expenses'),
    income:        getData('income'),
    accounts:      getDataObj('accounts', {}),
    accounts_list:    getDataObj('accounts_list', []),
    budgets:          getDataObj('budgets', {}),
    recurring:        getData('recurring'),
    lending_list:     getDataObj('lending_list', []),
    investments_list: getDataObj('investments_list', []),
    fd_list:          getDataObj('fd_list', []),
    rd_list:          getDataObj('rd_list', [])
  };
  localStorage.setItem('backup_pre_import', JSON.stringify(backup));

  if (data.expenses)         setData('expenses',          data.expenses);
  if (data.income)           setData('income',            data.income);
  if (data.accounts)         setData('accounts',          data.accounts);
  if (data.accounts_list)    setData('accounts_list',     data.accounts_list);
  if (data.budgets)          setData('budgets',           data.budgets);
  if (data.recurring)        setData('recurring',         data.recurring);
  if (data.lending_list)     setData('lending_list',      data.lending_list);
  if (data.investments_list) setData('investments_list',  data.investments_list);
  if (data.fd_list)          setData('fd_list',           data.fd_list);
  if (data.rd_list)          setData('rd_list',           data.rd_list);

  showToast('Data imported! Reloading...', 'success');
  setTimeout(() => location.reload(), 1200);
}

// ── Account Migration (old format → new array) ────────────────
(function migrateOldAccounts() {
  const existing = getDataObj('accounts_list', null);
  if (existing !== null) return;
  const old = getDataObj('accounts', null);
  const migrated = [];
  if (old) {
    if (old.savings)    migrated.push({ id: generateId(), name: 'Savings Account', type: 'bank', balance: Number(old.savings) || 0 });
    if (old.creditCard) migrated.push({ id: generateId(), name: 'Credit Card', type: 'credit', balance: Number(old.creditCard) || 0, billingDay: 1, dueDay: 15 });
    if (old.cash)       migrated.push({ id: generateId(), name: 'Cash', type: 'cash', balance: Number(old.cash) || 0 });
  }
  setData('accounts_list', migrated);
})();

// ── Portfolio Snapshots ────────────────────────────────────────
/**
 * Returns the stored array of portfolio snapshots sorted oldest-first.
 * Each snapshot: { date: 'YYYY-MM-DD', totalValue, mfValue, fdValue, rdValue }
 */
function getPortfolioSnapshots() {
  return getDataObj('portfolio_snapshots', []);
}

function savePortfolioSnapshots(snapshots) {
  setData('portfolio_snapshots', snapshots);
}

/**
 * Records a snapshot for today if no snapshot has been recorded today.
 * Call this once when the investments page loads.
 */
function recordPortfolioSnapshot() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshots = getPortfolioSnapshots();
    if (snapshots.length && snapshots[snapshots.length - 1].date === today) return; // already recorded today

    const investments = getAllInvestments();
    const fds = getAllFDs();
    const rds = getAllRDs();

    const mfValue  = investments.reduce((s, inv) => s + Number(inv.currentValue || 0), 0);
    const fdValue  = fds.reduce((s, fd) => s + calculateFDMaturityValue(fd), 0);
    const rdValue  = rds.reduce((s, rd) => s + calculateRDMaturityValue(rd), 0);
    const totalValue = mfValue + fdValue + rdValue;

    if (totalValue <= 0) return; // don't store empty snapshots

    snapshots.push({ date: today, totalValue, mfValue, fdValue, rdValue });

    // Keep only last 730 days (~2 years)
    const trimmed = snapshots.slice(-730);
    savePortfolioSnapshots(trimmed);
  } catch (e) {
    console.warn('recordPortfolioSnapshot: failed', e);
  }
}

/**
 * Returns portfolio growth stats relative to snapshots.
 * @returns {{ growth1m, growth3m, growth6m, growth1y, oldestDate, currentValue }}
 */
function getPortfolioGrowthStats() {
  const snapshots = getPortfolioSnapshots();
  if (!snapshots.length) return null;

  const current = snapshots[snapshots.length - 1];
  const currentVal = current.totalValue;
  const currentDate = new Date(current.date);

  function growthPct(daysAgo) {
    const targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() - daysAgo);
    // find the snapshot closest to or just before targetDate
    let best = null;
    for (let i = snapshots.length - 2; i >= 0; i--) {
      const d = new Date(snapshots[i].date);
      if (d <= targetDate) { best = snapshots[i]; break; }
    }
    if (!best || best.totalValue <= 0) return null;
    return ((currentVal - best.totalValue) / best.totalValue) * 100;
  }

  return {
    currentValue: currentVal,
    growth1m:  growthPct(30),
    growth3m:  growthPct(90),
    growth6m:  growthPct(180),
    growth1y:  growthPct(365),
    oldestDate: snapshots[0].date
  };
}
