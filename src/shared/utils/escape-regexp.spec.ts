import { escapeRegExp } from './escape-regexp';

describe('escapeRegExp', () => {
  it('leaves plain text unchanged', () => {
    expect(escapeRegExp('наліпка')).toBe('наліпка');
  });

  it('escapes regex metacharacters so they match literally', () => {
    expect(escapeRegExp('a.b')).toBe('a\\.b');
    expect(escapeRegExp('.*')).toBe('\\.\\*');
    expect(escapeRegExp('(a|b)')).toBe('\\(a\\|b\\)');
    expect(escapeRegExp('[abc]')).toBe('\\[abc\\]');
    expect(escapeRegExp('a+b?c^d$')).toBe('a\\+b\\?c\\^d\\$');
  });

  it('produces a pattern that matches the escaped value literally', () => {
    const value = '.*(a|b)[c]';
    const pattern = new RegExp(escapeRegExp(value));

    expect(pattern.test(value)).toBe(true);
    expect(pattern.test('anything else')).toBe(false);
  });
});
