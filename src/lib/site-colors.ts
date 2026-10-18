import { z } from 'zod';

export const themeTokens = [
  ['background', 'Fond des pages'], ['foreground', 'Texte principal'],
  ['primary', 'Boutons et liens principaux'], ['primary-foreground', 'Texte des boutons'],
  ['secondary', 'Fond secondaire'], ['secondary-foreground', 'Texte secondaire'],
  ['muted', 'Fond des sections'], ['muted-foreground', 'Texte discret'],
  ['accent', 'Fond des sélections'], ['accent-foreground', 'Texte des sélections'],
  ['border', 'Bordures'], ['input', 'Bordures des champs'], ['ring', 'Contour de sélection'],
  ['card', 'Fond des cartes'], ['destructive', 'Erreurs'],
  ['hero-foreground', 'Texte sur la photo d’accueil'], ['forest', 'Vert principal complémentaire'],
  ['sage', 'Accents doux'], ['sand', 'Bandeau de réservation'],
  ['footer', 'Fond du pied de page'], ['footer-foreground', 'Texte du pied de page'],
] as const;
export type ThemeToken = typeof themeTokens[number][0];
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choisissez une couleur valide.');
const tokenSchema = z.enum(themeTokens.map(([key]) => key) as [ThemeToken, ...ThemeToken[]]);
export const themeColorsSchema = z.record(tokenSchema, hexColor).refine(v => Object.keys(v).length <= themeTokens.length);
export const elementColorSchema = z.object({ color: hexColor.optional(), 'background-color': hexColor.optional(), 'border-color': hexColor.optional(), display: z.literal('none').optional(), translate: z.string().regex(/^-?\d{1,4}px -?\d{1,4}px$/).optional(), 'text-align': z.enum(['left', 'center', 'right']).optional(), 'margin-left': z.enum(['auto', '0px']).optional(), 'margin-right': z.enum(['auto', '0px']).optional(), 'justify-content': z.enum(['flex-start', 'center', 'flex-end']).optional() });
export type ElementColors = z.infer<typeof elementColorSchema>;
export const elementKeySchema = z.string().max(2000).refine(key => {
  const [path, selector, extra] = key.split('|');
  return extra === undefined && /^\/[a-zA-Z0-9/_-]*$/.test(path ?? '') && /^body(?: > [a-z][a-z0-9-]*:nth-of-type\([1-9][0-9]*\)){1,24}$/.test(selector ?? '');
}, 'Cet élément ne peut pas être modifié.');
export const mediaUrlSchema = z.string().max(2000).refine(v => (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\//.test(v), 'Adresse invalide.');
export const placedMediaSchema = z.object({ url: mediaUrlSchema, type: z.enum(['image', 'video']), layer: z.enum(['behind', 'front', 'before', 'after']), opacity: z.number().min(0.05).max(1).default(1) });
export type PlacedMedia = z.infer<typeof placedMediaSchema>;
export const placedMediaMapSchema = z.record(elementKeySchema, placedMediaSchema).refine(v => Object.keys(v).length <= 200);
export const elementColorsSchema = z.record(elementKeySchema, elementColorSchema).refine(v => Object.keys(v).length <= 500);

export function siteColorCss(theme: Record<string, string>, elements: Record<string, ElementColors>, pathname: string) {
  const safeTheme = themeColorsSchema.safeParse(theme);
  const safeElements = elementColorsSchema.safeParse(elements);
  const globals = safeTheme.success ? Object.entries(safeTheme.data).map(([key, value]) => `--${key}:${value};`).join('') : '';
  const local = safeElements.success ? Object.entries(safeElements.data).flatMap(([key, colors]) => {
    const [path, selector] = key.split('|');
    if (path !== pathname) return [];
    const rule = `${selector}{${Object.entries(colors).map(([property, value]) => `${property}:${value}!important;`).join('')}}`;
    return colors.display === 'none' ? `${rule}${(selector ?? '').replace(/^body/, 'body.site-editing')}{display:revert!important;opacity:.35!important;outline:2px dashed var(--destructive)!important}` : rule;
  }).join('') : '';
  return `${globals ? `:root{${globals}}` : ''}${local}`;
}

export function elementColorKey(element: Element, pathname: string) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    const tag = current.localName;
    const siblings: Element[] = current.parentElement ? Array.from(current.parentElement.children).filter(s => s.localName === tag) : [];
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = current.parentElement;
  }
  const key = `${pathname}|body > ${parts.join(' > ')}`;
  return elementKeySchema.safeParse(key).success ? key : null;
}