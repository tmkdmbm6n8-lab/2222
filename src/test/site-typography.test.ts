import { describe, expect, it } from 'vitest';
import { fontOptions, readTypography, typographyCss, typographyValueSchema, setTextRange, textSegments } from '../lib/site-typography';
import { editorSnapshot, recordEdit } from '../lib/editor-history';

describe('site typography', () => {
  const range = { start: 0, end: 4, text: 'Avis', font: 'verdana' as const, size: 32, color: '#ff0000' };
  it('styles a selected word and leaves the rest unchanged', () => {
    expect(textSegments('Avis clients', [range])).toEqual([{ text: 'Avis', index: 0 }, { text: ' clients' }]);
    const value = JSON.stringify({ font: 'site', size: null, ranges: [range] });
    expect(typographyValueSchema.safeParse(value).success).toBe(true);
    expect(typographyCss({ 'Avis clients': value })).toContain('--editor-range-color:#ff0000');
    expect(typographyCss({ 'Avis clients': value })).toContain('data-tclean-range="Avis%20clients:0"');
  });
  it('rejects unsafe colors and invalid character ranges', () => {
    for (const patch of [{ color: 'red;display:none' }, { end: 0 }, { text: 'wrong' }, { start: -1 }]) {
      expect(typographyValueSchema.safeParse(JSON.stringify({ font: 'site', size: null, ranges: [{ ...range, ...patch }] })).success).toBe(false);
    }
  });
  it('preserves unselected parts of overlapping styles and ignores outdated ranges', () => {
    const ranges = setTextRange([range], { ...range, start: 1, end: 3, text: 'vi', size: 20 });
    expect(ranges.map(r => r.text)).toEqual(['A', 'vi', 's']);
    expect(textSegments('Autre texte', [range])).toEqual([{ text: 'Autre texte' }]);
  });
  it('accepts every font offered by the selector', () => {
    expect(fontOptions.length).toBeGreaterThan(20);
    for (const option of fontOptions) expect(typographyValueSchema.safeParse(JSON.stringify({font: option.value, size: 24})).success).toBe(true);
  });
  it('validates font choices and bounded sizes', () => {
    expect(typographyValueSchema.safeParse('{"font":"arial","size":24}').success).toBe(true);
    for (const value of ['{"font":"evil;}","size":24}', '{"font":"arial","size":121}', '{"font":"arial","size":7}', 'invalid']) expect(typographyValueSchema.safeParse(value).success).toBe(false);
  });
  it('generates safe styling keyed by original text', () => {
    const css = typographyCss({ 'Texte "test"': '{"font":"georgia","size":24}' });
    expect(css).toContain('Texte%20%22test%22');
    expect(css).toContain('font-family:var(--editor-font-georgia)!important');
    expect(css).toContain('font-size:min(24px, calc(2.00vw + 8px))!important');
  });
  it('restores defaults and ignores invalid stored values', () => {
    expect(readTypography('bad')).toEqual({ font: 'site', size: null });
    expect(typographyCss({ text: '{"font":"site","size":null}' })).toBe('');
    expect(typographyCss({ text: '{"font":"arial;}","size":400}' })).toBe('');
  });
});
describe('editor history', () => {
  it('captures only editing fields, never prices or permissions', () => {
    const state = editorSnapshot({ content: { Bonjour: 'Salut' }, travelFee: 9, roles: ['admin'] });
    expect(state['content']).toEqual({ Bonjour: 'Salut' });
    expect(state).not.toHaveProperty('travelFee');
    expect(state).not.toHaveProperty('roles');
    expect(state['typography']).toEqual({});
  });
  it('keeps the previous state and limits history to 100', () => {
    let config: Record<string, unknown> = { content: { Hello: 'Bonjour' } };
    for (let i = 0; i < 105; i++) config = { ...config, editHistory: recordEdit(config, `Edit ${i}`) };
    const entries = recordEdit(config, 'Restoration');
    expect(entries).toHaveLength(100);
    expect(entries.at(-1)?.state['content']).toEqual({ Hello: 'Bonjour' });
    expect(entries.at(-1)?.state).not.toHaveProperty('editHistory');
  });
});