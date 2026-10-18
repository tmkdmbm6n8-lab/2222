import { describe, expect, it } from 'vitest';
import { siteColorCss, themeColorsSchema, elementKeySchema, elementColorSchema } from '../lib/site-colors';

describe('site colors', () => {
  it('allows only known tokens and hex colors', () => {
    expect(themeColorsSchema.safeParse({ primary: '#123456' }).success).toBe(true);
    expect(themeColorsSchema.safeParse({ primary: 'red;}' }).success).toBe(false);
    expect(themeColorsSchema.safeParse({ unknown: '#123456' }).success).toBe(false);
  });
  it('restricts selectors and properties', () => {
    expect(elementKeySchema.safeParse('/|body > div:nth-of-type(1)').success).toBe(true);
    expect(elementKeySchema.safeParse('/|body{color:red}').success).toBe(false);
    expect(elementColorSchema.safeParse({ color: 'url(example)' }).success).toBe(false);
  });
  it('renders only matching page overrides', () => {
    const elements = { '/|body > div:nth-of-type(1)': { color: '#abcdef' } };
    expect(siteColorCss({ primary: '#123456' }, elements, '/')).toContain('color:#abcdef!important');
    expect(siteColorCss({ primary: '#123456' }, elements, '/contact')).toBe(':root{--primary:#123456;}');
    expect(siteColorCss({ primary: 'bad' }, {}, '/')).toBe('');
  });
});