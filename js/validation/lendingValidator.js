// ════════════════════════════════════════════════════════════════
//  lendingValidator — validate lending records
// ════════════════════════════════════════════════════════════════

const LendingValidator = (function () {
  const r = Validation.rules;

  function validate(payload) {
    const data = {
      personName: Validation.sanitize.string(payload.personName, 60),
      amount: Validation.sanitize.number(payload.amount),
      type: Validation.sanitize.string(payload.type, 10).toLowerCase(),
      date: Validation.sanitize.date(payload.date),
      note: Validation.sanitize.string(payload.note, 200)
    };
    return Validation.run(data, {
      personName: [
        v => r.required(v, 'Person name is required'),
        v => r.minLength(v, 2),
        v => r.maxLength(v, 60)
      ],
      amount: [
        v => r.isNumber(v),
        v => r.positive(v, 'Amount must be greater than 0')
      ],
      type: [
        v => r.required(v),
        v => r.oneOf(v, ['lent', 'borrowed'], 'Type must be lent or borrowed')
      ],
      date: [
        v => r.isDate(v),
        v => r.notFuture(v, 'Lending date cannot be in the future')
      ]
    });
  }

  return { validate };
})();

if (typeof window !== 'undefined') window.LendingValidator = LendingValidator;
