import { escapeRegExp } from './escape-regexp';

describe('escapeRegExp', () => {
  it('leaves plain alphanumeric text untouched', () => {
    expect(escapeRegExp('amar')).toBe('amar');
    expect(escapeRegExp('Task 123')).toBe('Task 123');
  });

  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('a.b')).toBe('a\\.b');
    expect(escapeRegExp('a+b*c?')).toBe('a\\+b\\*c\\?');
    expect(escapeRegExp('(foo)[bar]')).toBe('\\(foo\\)\\[bar\\]');
    expect(escapeRegExp('a|b')).toBe('a\\|b');
    expect(escapeRegExp('a\\b')).toBe('a\\\\b');
  });

  it('produces a pattern that matches the literal input', () => {
    const input = 'a.b(c)+';
    const re = new RegExp(escapeRegExp(input), 'i');
    expect(re.test('xx a.b(c)+ yy')).toBe(true);
    expect(re.test('axbXcY')).toBe(false);
  });
});
