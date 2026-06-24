// ════════════════════════════════════════════════════════════════
//  amountValidator — validate currency / numeric amount inputs
//  Depends on: Validation
// ════════════════════════════════════════════════════════════════

const AmountValidator = (function () {
  const r = Validation.rules;

  function validate(amount, opts) {
    opts = opts || {};
    const max = opts.max != null ? opts.max : 1e10;
    const data = { amount: Validation.sanitize.number(amount) };
    return Validation.run(data, {
      amount: [
        v => r.required(v, 'Amount is required'),
        v => r.isNumber(v, 'Amount must be a number'),
        v => r.positive(v, 'Amount must be greater than 0'),
        v => r.max(v, max, `Amount cannot exceed ${max.toLocaleString('en-IN')}`)
      ]
    });
  }

  return { validate };
})();

if (typeof window !== 'undefined') window.AmountValidator = AmountValidator;
