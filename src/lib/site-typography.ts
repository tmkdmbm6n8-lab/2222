import { z } from 'zod';

export const fontOptions = [
  { value: 'site', label: 'Police du site' },
  { value: 'arial', label: 'Arial' },
  { value: 'helvetica', label: 'Helvetica' },
  { value: 'tahoma', label: 'Tahoma' },
  { value: 'verdana', label: 'Verdana' },
  { value: 'trebuchet', label: 'Trebuchet MS' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'courier', label: 'Courier New' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'opensans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'nunito', label: 'Nunito' },
  { value: 'raleway', label: 'Raleway' },
  { value: 'ubuntu', label: 'Ubuntu' },
  { value: 'oswald', label: 'Oswald' },
  { value: 'sourcesans', label: 'Source Sans 3' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'lora', label: 'Lora' },
  { value: 'dmsans', label: 'DM Sans' },
  { value: 'worksans', label: 'Work Sans' },
] as const;
const writingSchema = z.object({
  font: z.enum(['site', 'arial', 'helvetica', 'tahoma', 'verdana', 'trebuchet', 'georgia', 'times', 'courier', 'manrope', 'inter', 'roboto', 'opensans', 'lato', 'montserrat', 'poppins', 'nunito', 'raleway', 'ubuntu', 'oswald', 'sourcesans', 'playfair', 'merriweather', 'lora', 'dmsans', 'worksans']),
  size: z.number().int().min(8).max(120).nullable(),
}).strict();
export const textRangeSchema = writingSchema.extend({
  start: z.number().int().min(0).max(20000),
  end: z.number().int().min(1).max(20000),
  text: z.string().min(1).max(20000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
}).refine(v => v.end > v.start && v.text.length === v.end - v.start);
export type TextStyleRange = z.infer<typeof textRangeSchema>;
export const typographySchema = writingSchema.extend({ ranges: z.array(textRangeSchema).max(100).optional() }).strict();
export type Typography = z.infer<typeof typographySchema>;
export const typographyValueSchema = z.string().max(4000).refine(value => {
  try { return typographySchema.safeParse(JSON.parse(value)).success; } catch { return false; }
}, 'Réglages d’écriture non valides.');
export function readTypography(value?: string): Typography {
  try { const parsed = typographySchema.safeParse(JSON.parse(value ?? '{}')); if (parsed.success) return parsed.data; } catch { /* default */ }
  return { font: 'site', size: null };
}
export function typographyCss(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => {
    const typography = readTypography(value);
    const declarations = [typography.font !== 'site' ? `font-family:var(--editor-font-${typography.font})!important;` : '', typography.size !== null ? `font-size:min(${typography.size}px, calc(${(typography.size/12).toFixed(2)}vw + 8px))!important;line-height:1.35!important;` : ''].join('');
    const attr = encodeURIComponent(key).replace(/'/g, '%27');
    const ranges = (typography.ranges ?? []).map((range, index) => {
      const style = [range.font !== 'site' ? `font-family:var(--editor-font-${range.font})!important;` : '', range.size !== null ? `font-size:min(${range.size}px, calc(${(range.size/12).toFixed(2)}vw + 8px))!important;line-height:1.35!important;` : '', range.color ? `--editor-range-color:${range.color};color:var(--editor-range-color)!important;` : ''].join('');
      return `[data-tclean-range="${attr}:${index}"]{${style}}`;
    }).join('');
    return (declarations ? `[data-tclean-typography="${attr}"]{${declarations}}` : '') + ranges;
  }).join('');
}

export function setTextRange(ranges: TextStyleRange[], next: TextStyleRange): TextStyleRange[] {
  return [...ranges.flatMap(range => {
    if (range.end <= next.start || range.start >= next.end) return [range];
    const remaining: TextStyleRange[] = [];
    if (range.start < next.start) remaining.push({ ...range, end: next.start, text: range.text.slice(0, next.start - range.start) });
    if (range.end > next.end) remaining.push({ ...range, start: next.end, text: range.text.slice(next.end - range.start) });
    return remaining;
  }), next].sort((a, b) => a.start - b.start);
}

export function textSegments(text: string, ranges: TextStyleRange[]) {
  const valid = ranges.map((range, index) => ({ ...range, index })).filter(range => text.slice(range.start, range.end) === range.text).sort((a, b) => a.start - b.start);
  const segments: { text: string; index?: number }[] = []; let cursor = 0;
  for (const range of valid) {
    if (range.start < cursor) continue;
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start) });
    segments.push({ text: range.text, index: range.index }); cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}