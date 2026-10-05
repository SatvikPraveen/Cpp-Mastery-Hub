import { sanitizeForLog } from '../../src/utils/sanitizeLog';

describe('sanitizeForLog', () => {
  it('removes line breaks so a value cannot forge extra log lines', () => {
    expect(sanitizeForLog('a\r\nINFO fake entry')).toBe('a  INFO fake entry');
  });

  it('serialises objects and truncates long values', () => {
    expect(sanitizeForLog({ a: 1 })).toBe('{"a":1}');
    expect(sanitizeForLog('x'.repeat(20), 5)).toBe('xxxxx...');
  });
});
