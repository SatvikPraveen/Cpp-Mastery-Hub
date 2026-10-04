import {
  validateEmail,
  validatePasswordConfirmation,
  validatePasswordRequirements,
} from '../../src/utils/validation';

describe('validateEmail', () => {
  it.each(['ada@example.com', 'a.b+c@sub.domain.org'])('accepts %s', (email) => {
    expect(validateEmail(email)).toEqual({ isValid: true, errors: [] });
  });

  it.each(['', 'ada', 'ada@', 'ada@example', 'a da@example.com'])('rejects %p', (email) => {
    const result = validateEmail(email);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});

describe('validatePasswordRequirements', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordRequirements('Str0ng!pass').isValid).toBe(true);
  });

  it('reports each missing requirement separately', () => {
    const result = validatePasswordRequirements('abc');
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Password must be at least 8 characters long',
      'Password must contain at least one uppercase letter',
      'Password must contain at least one number',
      'Password must contain at least one special character',
    ]);
  });
});

describe('validatePasswordConfirmation', () => {
  it('requires an exact match', () => {
    expect(validatePasswordConfirmation('a', 'a').isValid).toBe(true);
    expect(validatePasswordConfirmation('a', 'A').errors).toEqual(['Passwords do not match']);
  });
});
