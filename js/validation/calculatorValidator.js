// ════════════════════════════════════════════════════════════════
//  calculatorValidator — validate inputs for EMI/SIP/SWP calculators
// ════════════════════════════════════════════════════════════════

const CalculatorValidator = (function () {
  const r = Validation.rules;

  function emi(payload) {
    const data = {
      principal: Validation.sanitize.number(payload.principal),
      rate:      Validation.sanitize.number(payload.rate),
      tenure:    Validation.sanitize.number(payload.tenure)
    };
    return Validation.run(data, {
      principal: [v => r.positive(v, 'Loan amount must be > 0'), v => r.max(v, 1e9)],
      rate:      [v => r.nonNegative(v, 'Rate cannot be negative'), v => r.max(v, 100, 'Rate seems too high')],
      tenure:    [v => r.positive(v, 'Tenure must be > 0'), v => r.max(v, 600, 'Tenure too long (max 600 months)')]
    });
  }

  function sip(payload) {
    const data = {
      monthly:  Validation.sanitize.number(payload.monthly),
      rate:     Validation.sanitize.number(payload.rate),
      years:    Validation.sanitize.number(payload.years)
    };
    return Validation.run(data, {
      monthly: [v => r.positive(v, 'Monthly investment must be > 0')],
      rate:    [v => r.nonNegative(v), v => r.max(v, 50)],
      years:   [v => r.positive(v, 'Years must be > 0'), v => r.max(v, 60)]
    });
  }

  function swp(payload) {
    const data = {
      corpus:   Validation.sanitize.number(payload.corpus),
      withdraw: Validation.sanitize.number(payload.withdraw),
      rate:     Validation.sanitize.number(payload.rate),
      years:    Validation.sanitize.number(payload.years)
    };
    return Validation.run(data, {
      corpus:   [v => r.positive(v, 'Corpus must be > 0')],
      withdraw: [v => r.positive(v, 'Withdrawal must be > 0')],
      rate:     [v => r.nonNegative(v), v => r.max(v, 50)],
      years:    [v => r.positive(v), v => r.max(v, 60)]
    });
  }

  function goalSip(payload) {
    const data = {
      goal:  Validation.sanitize.number(payload.goal),
      rate:  Validation.sanitize.number(payload.rate),
      years: Validation.sanitize.number(payload.years)
    };
    return Validation.run(data, {
      goal:  [v => r.positive(v, 'Goal amount must be > 0')],
      rate:  [v => r.nonNegative(v), v => r.max(v, 50)],
      years: [v => r.positive(v), v => r.max(v, 60)]
    });
  }

  return { emi, sip, swp, goalSip };
})();

if (typeof window !== 'undefined') window.CalculatorValidator = CalculatorValidator;
