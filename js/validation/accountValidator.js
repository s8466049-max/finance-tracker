// ════════════════════════════════════════════════════════════════
//  accountValidator — validate account creation / update payloads
// ════════════════════════════════════════════════════════════════

const AccountValidator = (function () {
  const r = Validation.rules;
  const TYPES = ['savings', 'checking', 'credit', 'cash', 'wallet', 'investment'];

  function validate(payload) {
    const data = {
      name: Validation.sanitize.string(payload.name, 60),
      type: Validation.sanitize.string(payload.type, 20).toLowerCase(),
      balance: Validation.sanitize.number(payload.balance != null ? payload.balance : 0)
    };
    return Validation.run(data, {
      name: [
        v => r.required(v, 'Account name is required'),
        v => r.minLength(v, 2, 'Name must be at least 2 characters'),
        v => r.maxLength(v, 60)
      ],
      type: [
        v => r.required(v, 'Account type is required'),
        v => r.oneOf(v, TYPES, 'Invalid account type')
      ],
      balance: [
        v => r.isNumber(v, 'Balance must be a number')
      ]
    });
  }

  return { validate, TYPES };
})();

if (typeof window !== 'undefined') window.AccountValidator = AccountValidator;
