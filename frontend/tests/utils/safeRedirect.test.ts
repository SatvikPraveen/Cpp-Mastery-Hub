import { safeReturnUrl } from '../../src/utils/safeRedirect';

describe('safeReturnUrl', () => {
  it('accepts same-origin relative paths', () => {
    expect(safeReturnUrl('/learn/cpp?x=1#a', '/learn')).toBe('/learn/cpp?x=1#a');
  });

  it.each([
    undefined,
    '',
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/foo\nbar',
    'learn',
  ])('falls back for unsafe value %p', (value) => {
    expect(safeReturnUrl(value, '/learn')).toBe('/learn');
  });

  it('uses the first element of an array query value', () => {
    expect(safeReturnUrl(['/a', '/b'], '/learn')).toBe('/a');
  });
});
