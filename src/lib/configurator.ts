import { z } from 'zod';
import type { BusinessConfig } from './business';
import { defaultConfig, travelCharge } from './business';

export type FurnitureType = 'sofa2' | 'sofa3' | 'sofa4' | 'angleLeft' | 'angleRight' | 'panoramic' | 'convertible' | 'armchair' | 'meridienne' | 'mattress1' | 'mattress2' | 'chair' | 'sofa5' | 'pouf' | 'cushion';

export const furnitureTypes: { id: FurnitureType; label: string; service: string; seats: number; family: 'sofa' | 'armchair' | 'mattress' | 'chair' | 'accessory' }[] = [
  { id: 'sofa2', label: 'Canapé 2 places', service: 'canape-tissu', seats: 2, family: 'sofa' },
  { id: 'sofa3', label: 'Canapé 3 places', service: 'canape-tissu', seats: 3, family: 'sofa' },
  { id: 'sofa4', label: 'Canapé 4 places', service: 'canape-tissu', seats: 4, family: 'sofa' },
  { id: 'sofa5', label: 'Canapé 5 places', service: 'canape-tissu', seats: 5, family: 'sofa' },
  { id: 'angleLeft', label: 'Canapé d’angle gauche', service: 'canape-angle', seats: 4, family: 'sofa' },
  { id: 'angleRight', label: 'Canapé d’angle droit', service: 'canape-angle', seats: 4, family: 'sofa' },
  { id: 'panoramic', label: 'Panoramique en U', service: 'canape-angle', seats: 6, family: 'sofa' },
  { id: 'meridienne', label: 'Canapé avec méridienne', service: 'canape-angle', seats: 3, family: 'sofa' },
  { id: 'convertible', label: 'Canapé convertible', service: 'canape-convertible', seats: 3, family: 'sofa' },
  { id: 'armchair', label: 'Fauteuil une place', service: 'fauteuil', seats: 1, family: 'armchair' },
  { id: 'mattress1', label: 'Matelas une place', service: 'matelas', seats: 1, family: 'mattress' },
  { id: 'mattress2', label: 'Matelas deux places', service: 'matelas', seats: 2, family: 'mattress' },
  { id: 'chair', label: 'Chaise rembourrée', service: 'chaises', seats: 1, family: 'chair' },
  { id: 'pouf', label: 'Pouf seul', service: 'pouf', seats: 1, family: 'accessory' },
  { id: 'cushion', label: 'Coussins seuls', service: 'coussins', seats: 1, family: 'accessory' },
];

export const fabrics = [
  { id: 'classique', label: 'Tissu classique', description: 'Tissage serré, toucher régulier.', check: false },
  { id: 'velours', label: 'Velours', description: 'Poils courts et reflets, sensible au sens du poil.', check: true },
  { id: 'microfibre', label: 'Microfibre', description: 'Fibres fines, douces et denses.', check: false },
  { id: 'boucle', label: 'Tissu bouclé', description: 'Petites boucles en relief, à traiter avec délicatesse.', check: true },
  { id: 'lin', label: 'Lin ou aspect lin', description: 'Fibre naturelle, peut réagir à l’humidité.', check: true },
  { id: 'coton', label: 'Coton', description: 'Fibre naturelle respirante.', check: true },
  { id: 'synthetique', label: 'Tissu synthétique', description: 'Polyester ou mélanges techniques.', check: false },
  { id: 'cuir', label: 'Cuir ou similicuir', description: 'Surface lisse, méthode spécifique à vérifier.', check: true },
  { id: 'autre', label: 'Autre tissu', description: 'Précisez-le dans votre commentaire.', check: true },
  { id: 'inconnu', label: 'Je ne connais pas le tissu', description: 'Une photo nous aidera à l’identifier.', check: true },
] as const;
export type FabricId = (typeof fabrics)[number]['id'];

export const colors = [
  { id: 'beige', label: 'Beige', hex: '#cdb89a' }, { id: 'creme', label: 'Crème', hex: '#e8dcc4' }, { id: 'blanc-casse', label: 'Blanc cassé', hex: '#ece7dc' },
  { id: 'gris-clair', label: 'Gris clair', hex: '#bdbcb7' }, { id: 'anthracite', label: 'Gris anthracite', hex: '#4a4c4e' }, { id: 'noir', label: 'Noir', hex: '#262626' },
  { id: 'taupe', label: 'Taupe', hex: '#8f7f70' }, { id: 'marron', label: 'Marron', hex: '#7a5235' }, { id: 'chocolat', label: 'Chocolat', hex: '#4b3022' },
  { id: 'marine', label: 'Bleu marine', hex: '#283a57' }, { id: 'bleu-clair', label: 'Bleu clair', hex: '#9db5cc' }, { id: 'sauge', label: 'Vert sauge', hex: '#9fae95' },
  { id: 'vert-fonce', label: 'Vert foncé', hex: '#2f4a3b' }, { id: 'terracotta', label: 'Terracotta', hex: '#b4644a' }, { id: 'rose', label: 'Rose poudré', hex: '#d9b3ab' },
  { id: 'bordeaux', label: 'Bordeaux', hex: '#6a2730' }, { id: 'autre', label: 'Autre couleur', hex: '#a9a49a' },
] as const;

export const configuratorSchema = z.object({
  type: z.enum(['sofa2', 'sofa3', 'sofa4', 'angleLeft', 'angleRight', 'panoramic', 'convertible', 'armchair', 'meridienne', 'mattress1', 'mattress2', 'chair', 'sofa5', 'pouf', 'cushion']),
  arms: z.enum(['standard', 'wide', 'thin', 'none']),
  seatCushions: z.number().int().min(1).max(8),
  backCushions: z.number().int().min(0).max(8),
  decorative: z.boolean(), pouf: z.boolean(),
  extraArmchairs: z.number().int().min(0).max(10), extraChairs: z.number().int().min(0).max(12),
  width: z.number().int().min(0).max(600),
  fabric: z.enum(fabrics.map(f => f.id) as [FabricId, ...FabricId[]]),
  color: z.string().max(20), otherColor: z.string().max(80),
  soil: z.enum(['light', 'moderate', 'heavy']),
  stains: z.boolean(), odors: z.boolean(), pets: z.boolean(), removable: z.boolean(),
  faces: z.enum(['one', 'two']).default('one'),
});
export type Configuration = z.infer<typeof configuratorSchema>;

export const defaultConfiguration: Configuration = { type: 'sofa3', arms: 'standard', seatCushions: 3, backCushions: 3, decorative: false, pouf: false, extraArmchairs: 0, extraChairs: 0, width: 0, fabric: 'classique', color: 'beige', otherColor: '', soil: 'moderate', stains: false, odors: false, pets: false, removable: false, faces: 'one' };

export function serviceFurniture(slug: string): FurnitureType | undefined {
  return furnitureTypes.find(t => t.service === slug)?.id;
}

export const typeInfo = (t: FurnitureType) => furnitureTypes.find(f => f.id === t)!;
export const soilLabels = { light: 'Peu sale', moderate: 'Modérément sale', heavy: 'Très sale' } as const;
export const armLabels = { standard: 'Accoudoirs classiques', wide: 'Accoudoirs larges', thin: 'Accoudoirs fins', none: 'Sans accoudoirs' } as const;

/** Applies defaults compatible with a newly chosen furniture type. */
export function forType(prev: Configuration, type: FurnitureType): Configuration {
  const info = typeInfo(type); const sofa = info.family === 'sofa';
  const seats = type === 'panoramic' ? 5 : type === 'angleLeft' || type === 'angleRight' ? 3 : info.seats;
  return { ...prev, type, arms: sofa || info.family === 'armchair' ? (prev.arms === 'none' && info.family === 'armchair' ? 'wide' : prev.arms) : 'none', seatCushions: info.family === 'mattress' ? 1 : seats, backCushions: info.family === 'mattress' ? 0 : seats, decorative: sofa ? prev.decorative : false, pouf: sofa ? prev.pouf : false };
}

export type PriceLine = { label: string; quantity: number; unit: number | null; from?: boolean };
/** Lot pricing for fabric chairs: 1 → chair1, up to 4 → chair4, up to 6 → chair6, up to 8 → chair8, then per additional 8-lot. */
export function chairLotPrice(p: typeof defaultConfig.configuratorPrices, qty: number): number | null {
  if (qty <= 0) return 0;
  const lots = Math.floor(qty / 8); const rest = qty % 8;
  const restPrice = rest === 0 ? 0 : rest === 1 ? p.chair1 : rest <= 4 ? p.chair4 : rest <= 6 ? p.chair6 : p.chair8;
  if (p.chair8 == null || restPrice == null) return null;
  return lots * p.chair8 + restPrice;
}
export function priceConfiguration(c: BusinessConfig, cfg: Configuration) {
  const p = { ...defaultConfig.configuratorPrices, ...(c.configuratorPrices ?? {}) } as typeof defaultConfig.configuratorPrices;
  const info = typeInfo(cfg.type);
  const from = cfg.type === 'angleLeft' || cfg.type === 'angleRight' || cfg.type === 'meridienne' || cfg.type === 'panoramic';
  let unit: number | null; let label = info.label;
  if (info.family === 'sofa' && !from) { const seats = Math.min(Math.max(cfg.seatCushions, 2), 5); unit = p[(`sofa${seats}`) as 'sofa2' | 'sofa3' | 'sofa4' | 'sofa5'] ?? null; label = `Canapé ${seats} places`; }
  else if (cfg.type === 'panoramic') unit = p.panoramic ?? null;
  else if (from) unit = p.angle ?? null;
  else if (info.family === 'armchair') unit = p.armchair ?? null;
  else if (cfg.type === 'mattress1') { unit = cfg.faces === 'two' ? p.mattress1two ?? null : p.mattress1one ?? null; label = `Matelas 1 personne, ${cfg.faces === 'two' ? 'deux faces' : 'une face'}`; }
  else if (cfg.type === 'mattress2') { unit = cfg.faces === 'two' ? p.mattress2two ?? null : p.mattress2one ?? null; label = `Matelas 2 personnes, ${cfg.faces === 'two' ? 'deux faces' : 'une face'}`; }
  else if (cfg.type === 'pouf') unit = p.pouf ?? null;
  else if (cfg.type === 'cushion') { unit = p.decoCushion ?? null; label = 'Coussin'; }
  else { unit = chairLotPrice(p, 1); }
  const lines: PriceLine[] = [{ label, quantity: cfg.type === 'cushion' ? Math.max(1, cfg.seatCushions) : 1, unit, from }];
  if (cfg.extraArmchairs) lines.push({ label: 'Fauteuils supplémentaires', quantity: cfg.extraArmchairs, unit: p.armchair ?? null });
  if (cfg.extraChairs) lines.push({ label: 'Chaises supplémentaires', quantity: cfg.extraChairs, unit: chairLotPrice(p, cfg.extraChairs) });
  if (cfg.pouf) lines.push({ label: 'Pouf assorti', quantity: 1, unit: p.pouf ?? null });
  const deco = cfg.decorative && info.family === 'sofa' ? Math.max(0, cfg.backCushions - cfg.seatCushions) : 0;
  if (deco) lines.push({ label: 'Coussins décoratifs supplémentaires', quantity: deco, unit: p.decoCushion ?? null });
  const complete = lines.every(l => l.unit !== null);
  const subtotal = lines.reduce((sum, l) => sum + (l.unit ?? 0) * (l.label.startsWith('Chaises supplémentaires') ? 1 : l.quantity), 0);
  const travelFee = travelCharge(c, complete ? subtotal : null);
  const total = complete ? Math.round(Math.max(subtotal + (travelFee ?? 0), c.minimum ?? 0) * 100) / 100 : null;
  return { lines, total, travelFee, needsCheck: fabrics.find(f => f.id === cfg.fabric)?.check || cfg.soil === 'heavy' || cfg.stains || cfg.odors };
}

export function availableTypes(c: BusinessConfig) { return furnitureTypes.filter(t => c.services.some(s => s.slug === t.service && s.enabled)); }

export function summarize(cfg: Configuration) {
  const f = fabrics.find(x => x.id === cfg.fabric)!; const col = colors.find(x => x.id === cfg.color);
  const flags = [cfg.stains && 'taches visibles', cfg.odors && 'odeurs', cfg.pets && 'poils d’animaux', cfg.removable && 'coussins amovibles'].filter(Boolean).join(', ');
  return `${typeInfo(cfg.type).label} · ${f.label} · ${cfg.color === 'autre' ? cfg.otherColor || 'Autre couleur' : col?.label ?? cfg.color} · ${soilLabels[cfg.soil]}${flags ? ' · ' + flags : ''}`;
}
