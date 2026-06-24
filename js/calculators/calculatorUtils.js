/* ═══════════════════════════════════════════════════════════════
   Calculator Utilities — Shared finance formulas
   ═══════════════════════════════════════════════════════════════ */

// ── Number formatting ──────────────────────────────────────────
function calcFmt(val) {
  const n = Math.round(Number(val) || 0);
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

function calcFmtShort(val) {
  // Delegate to the centralized compact-currency formatter so calculator
  // displays stay consistent with the rest of the app (no stray trailing
  // zeros like "12.00 Cr" or "1.0K").
  if (typeof window !== 'undefined' && typeof window.formatCompactCurrency === 'function') {
    return window.formatCompactCurrency(Math.abs(Number(val) || 0));
  }
  return '₹' + Math.round(Math.abs(Number(val) || 0));
}

// ── SIP Calculator ─────────────────────────────────────────────
// M = P × [((1+i)^n − 1) / i] × (1+i)
function calculateSIP(monthly, annualRate, years) {
  const P = Number(monthly) || 0;
  const r = (Number(annualRate) || 0) / 100;
  const n = Math.round((Number(years) || 0) * 12);
  const i = r / 12;

  if (P <= 0 || n <= 0) {
    return { invested: 0, returns: 0, maturity: 0, schedule: [] };
  }

  let maturity;
  if (i === 0) {
    maturity = P * n;
  } else {
    maturity = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  }
  const invested = P * n;
  const returns = maturity - invested;

  // Yearly schedule for chart
  const schedule = [];
  for (let y = 1; y <= Math.ceil(n / 12); y++) {
    const months = Math.min(y * 12, n);
    let val;
    if (i === 0) val = P * months;
    else val = P * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    schedule.push({
      year: y,
      invested: P * months,
      value: val
    });
  }

  return { invested, returns, maturity, schedule };
}

// ── Goal SIP Calculator ────────────────────────────────────────
// P = M × i / [((1+i)^n − 1) × (1+i)]
function calculateGoalSIP(goal, years, annualRate) {
  const M = Number(goal) || 0;
  const r = (Number(annualRate) || 0) / 100;
  const n = Math.round((Number(years) || 0) * 12);
  const i = r / 12;

  if (M <= 0 || n <= 0) {
    return { monthlySIP: 0, invested: 0, returns: 0, goal: M };
  }

  let monthlySIP;
  if (i === 0) {
    monthlySIP = M / n;
  } else {
    monthlySIP = (M * i) / ((Math.pow(1 + i, n) - 1) * (1 + i));
  }
  const invested = monthlySIP * n;
  const returns = M - invested;

  return { monthlySIP, invested, returns, goal: M };
}

// ── EMI Calculator ─────────────────────────────────────────────
// E = P × i × (1+i)^n / [(1+i)^n − 1]
function calculateEMI(loan, annualRate, years) {
  const P = Number(loan) || 0;
  const r = (Number(annualRate) || 0) / 100;
  const n = Math.round((Number(years) || 0) * 12);
  const i = r / 12;

  if (P <= 0 || n <= 0) {
    return { emi: 0, totalInterest: 0, totalRepayment: 0, principal: P, schedule: [] };
  }

  let emi;
  if (i === 0) {
    emi = P / n;
  } else {
    emi = (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }
  const totalRepayment = emi * n;
  const totalInterest = totalRepayment - P;

  // Yearly amortization schedule
  const schedule = [];
  let balance = P;
  for (let y = 1; y <= Math.ceil(n / 12); y++) {
    let yearInterest = 0;
    let yearPrincipal = 0;
    const monthsThisYear = Math.min(12, n - (y - 1) * 12);
    for (let m = 0; m < monthsThisYear; m++) {
      const interest = balance * i;
      const principal = emi - interest;
      yearInterest += interest;
      yearPrincipal += principal;
      balance -= principal;
    }
    schedule.push({
      year: y,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance)
    });
  }

  return { emi, totalInterest, totalRepayment, principal: P, schedule };
}

// ── SWP Calculator ─────────────────────────────────────────────
// Monthly simulation: balance grows by i, then withdrawal subtracted
function calculateSWP(corpus, monthlyWithdrawal, annualRate, years) {
  const C = Number(corpus) || 0;
  const W = Number(monthlyWithdrawal) || 0;
  const r = (Number(annualRate) || 0) / 100;
  const totalMonths = Math.round((Number(years) || 0) * 12);
  const i = r / 12;

  if (C <= 0 || totalMonths <= 0) {
    return {
      remaining: C, totalWithdrawn: 0, exhaustionMonth: null,
      lasts: 0, schedule: []
    };
  }

  let balance = C;
  let totalWithdrawn = 0;
  let exhaustionMonth = null;
  const schedule = [];

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + i);
    const withdraw = Math.min(W, balance);
    balance -= withdraw;
    totalWithdrawn += withdraw;
    if (balance <= 0 && exhaustionMonth === null) {
      exhaustionMonth = m;
      balance = 0;
    }
    if (m % 12 === 0 || m === totalMonths) {
      schedule.push({
        year: Math.ceil(m / 12),
        balance: balance,
        withdrawnSoFar: totalWithdrawn
      });
    }
    if (balance <= 0) break;
  }

  // Estimate true exhaustion if not hit within years
  let lastsMonths = exhaustionMonth;
  if (exhaustionMonth === null && i > 0) {
    // Solve for n: C*(1+i)^n - W*(((1+i)^n - 1)/i) = 0
    // (1+i)^n = W / (W - C*i)
    if (W > C * i) {
      const ratio = W / (W - C * i);
      lastsMonths = Math.log(ratio) / Math.log(1 + i);
    } else {
      lastsMonths = Infinity; // sustainable forever
    }
  } else if (exhaustionMonth === null && i === 0 && W > 0) {
    lastsMonths = C / W;
  }

  return {
    remaining: balance,
    totalWithdrawn,
    exhaustionMonth,
    lasts: lastsMonths,
    schedule
  };
}

// ── Lump Sum Calculator ────────────────────────────────────────
// FV = P × (1+r)^n   (annual compounding)
function calculateLumpSum(amount, annualRate, years) {
  const P = Number(amount) || 0;
  const r = (Number(annualRate) || 0) / 100;
  const n = Math.round(Number(years) || 0);

  if (P <= 0 || n <= 0) {
    return { invested: P, returns: 0, futureValue: P, schedule: [] };
  }

  const futureValue = P * Math.pow(1 + r, n);
  const returns = futureValue - P;

  const schedule = [];
  for (let y = 0; y <= n; y++) {
    schedule.push({
      year: y,
      invested: P,
      value: P * Math.pow(1 + r, y)
    });
  }

  return { invested: P, returns, futureValue, schedule };
}

// ── Income Tax Calculator (FY 2025-26) ─────────────────────────
// Slabs reflect Indian Union Budget 2025 (effective FY 2025-26 / AY 2026-27).
function _taxFromSlabs(taxable, slabs) {
  let tax = 0;
  let prev = 0;
  for (const [upto, rate] of slabs) {
    if (taxable > upto) {
      tax += (upto - prev) * rate;
      prev = upto;
    } else {
      tax += Math.max(0, taxable - prev) * rate;
      return tax;
    }
  }
  return tax;
}

const _SLABS_NEW = [
  [400000, 0],
  [800000, 0.05],
  [1200000, 0.10],
  [1600000, 0.15],
  [2000000, 0.20],
  [2400000, 0.25],
  [Infinity, 0.30]
];
const _SLABS_OLD = [
  [250000, 0],
  [500000, 0.05],
  [1000000, 0.20],
  [Infinity, 0.30]
];

function _computeRegimeNew(grossIncome, hasSalary) {
  const stdDed = hasSalary ? 75000 : 0;
  const taxable = Math.max(0, grossIncome - stdDed);
  let baseTax = _taxFromSlabs(taxable, _SLABS_NEW);
  // Section 87A rebate — full rebate if taxable income ≤ 12L
  if (taxable <= 1200000) baseTax = 0;
  const cess = baseTax * 0.04;
  const totalTax = baseTax + cess;
  return {
    taxable,
    baseTax,
    cess,
    totalTax,
    deductions: stdDed,
    takeHome: grossIncome - totalTax,
    effectiveRate: grossIncome ? (totalTax / grossIncome) * 100 : 0,
    breakup: { stdDed }
  };
}

function _computeRegimeOld(grossIncome, hasSalary, ded) {
  const stdDed = hasSalary ? 50000 : 0;
  const d80C  = Math.min(Math.max(0, Number(ded.d80C)  || 0), 150000);
  const d80D  = Math.min(Math.max(0, Number(ded.d80D)  || 0), 75000);
  const dHRA  = Math.max(0, Number(ded.dHRA)  || 0);
  const dHome = Math.min(Math.max(0, Number(ded.dHome) || 0), 200000);
  const dNPS  = Math.min(Math.max(0, Number(ded.dNPS)  || 0), 50000);
  const totalDed = stdDed + d80C + d80D + dHRA + dHome + dNPS;
  const taxable = Math.max(0, grossIncome - totalDed);
  let baseTax = _taxFromSlabs(taxable, _SLABS_OLD);
  // Section 87A rebate — full rebate if taxable income ≤ 5L
  if (taxable <= 500000) baseTax = 0;
  const cess = baseTax * 0.04;
  const totalTax = baseTax + cess;
  return {
    taxable,
    baseTax,
    cess,
    totalTax,
    deductions: totalDed,
    takeHome: grossIncome - totalTax,
    effectiveRate: grossIncome ? (totalTax / grossIncome) * 100 : 0,
    breakup: { stdDed, d80C, d80D, dHRA, dHome, dNPS }
  };
}

function calculateIncomeTax(input) {
  const salary = Math.max(0, Number(input.salary) || 0);
  const other  = Math.max(0, Number(input.other)  || 0);
  const bonus  = Math.max(0, Number(input.bonus)  || 0);
  const grossIncome = salary + other + bonus;
  const hasSalary = salary > 0;

  const regimeNew = _computeRegimeNew(grossIncome, hasSalary);
  const regimeOld = _computeRegimeOld(grossIncome, hasSalary, {
    d80C: input.d80C, d80D: input.d80D, dHRA: input.dHRA,
    dHome: input.dHome, dNPS: input.dNPS
  });

  const better = regimeOld.totalTax < regimeNew.totalTax ? 'old' : 'new';
  const savings = Math.abs(regimeOld.totalTax - regimeNew.totalTax);

  return { grossIncome, salary, other, bonus, new: regimeNew, old: regimeOld, better, savings };
}
