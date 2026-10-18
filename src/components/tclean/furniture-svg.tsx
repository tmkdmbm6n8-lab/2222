import { useId } from 'react';
import { colors, typeInfo, type Configuration } from '@/lib/configurator';

type Part = { d: string; kind: 'back' | 'seat' | 'arm' | 'cushion' | 'deco' | 'base' | 'side' };
const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;
const poly = (pts: number[][]) => 'M' + pts.map(p => p.join(',')).join('L') + 'Z';

function geometry(cfg: Configuration): { parts: Part[]; legs: number[][] } {
  const info = typeInfo(cfg.type); const parts: Part[] = []; const legs: number[][] = [];
  if (info.family === 'mattress') {
    const w = cfg.type === 'mattress2' ? 380 : 230; const x = 300 - w / 2;
    parts.push({ d: poly([[x + 40, 150], [x + w + 40, 150], [x + w, 230], [x, 230]]), kind: 'seat' });
    parts.push({ d: rr(x, 230, w, 40, 6), kind: 'side' });
    return { parts, legs };
  }
  if (info.family === 'chair') {
    parts.push({ d: rr(250, 70, 100, 140, 18), kind: 'back' }); parts.push({ d: rr(235, 200, 130, 38, 12), kind: 'seat' });
    legs.push([248, 238, 8, 62], [344, 238, 8, 62]); return { parts, legs };
  }
  const seats = cfg.type === 'armchair' ? 1 : cfg.seatCushions;
  const armW = cfg.arms === 'wide' ? 46 : cfg.arms === 'thin' ? 16 : cfg.arms === 'none' ? 0 : 30;
  const seatW = info.family === 'armchair' ? 130 : Math.min(110, 400 / Math.max(seats, 1));
  const left = cfg.type === 'angleLeft' || cfg.type === 'panoramic' || (cfg.type === 'meridienne');
  const right = cfg.type === 'angleRight' || cfg.type === 'panoramic';
  const chaise = 90; const inner = seats * seatW; const total = inner + 2 * armW + (left ? chaise : 0) + (right ? chaise : 0);
  let x0 = 300 - total / 2; const top = 110, seatY = 195, bottom = 262;
  parts.push({ d: rr(x0 + armW * 0.4, top, total - armW * 0.8, 100, 14), kind: 'back' });
  parts.push({ d: rr(x0, seatY + 20, total, bottom - seatY - 20, 8), kind: 'base' });
  const backN = Math.max(cfg.backCushions, 0);
  if (backN) { const bw = (total - 2 * armW - 16) / backN; for (let i = 0; i < backN; i++) parts.push({ d: rr(x0 + armW + 8 + i * bw + 3, top + 18, bw - 6, 80, 16), kind: 'cushion' }); }
  if (armW) { parts.push({ d: rr(x0, top + 55, armW, bottom - top - 55, armW / 2.4), kind: 'arm' }); parts.push({ d: rr(x0 + total - armW, top + 55, armW, bottom - top - 55, armW / 2.4), kind: 'arm' }); }
  const sx = x0 + armW + (left ? chaise : 0);
  for (let i = 0; i < seats; i++) parts.push({ d: rr(sx + i * seatW + 2, seatY, seatW - 4, 38, 10), kind: 'seat' });
  // chaise / corner extensions drawn in light perspective, projecting towards the viewer
  const ext = (cx: number) => { parts.push({ d: poly([[cx, seatY], [cx + chaise, seatY], [cx + chaise + 14, 300], [cx - 14, 300]]), kind: 'seat' }); parts.push({ d: rr(cx - 14, 296, chaise + 28, 22, 6), kind: 'side' }); };
  if (left) ext(x0 + armW + 2); if (right) ext(x0 + total - armW - chaise - 2);
  if (cfg.decorative) { parts.push({ d: rr(sx + 10, seatY - 46, 50, 46, 14), kind: 'deco' }); parts.push({ d: rr(sx + inner - 60, seatY - 46, 50, 46, 14), kind: 'deco' }); }
  if (cfg.type === 'convertible') parts.push({ d: rr(sx, bottom - 18, inner, 4, 2), kind: 'side' });
  if (cfg.pouf) parts.push({ d: rr(470 > x0 + total ? 470 : 300 + total / 2 - 30, 290, 90, 36, 12), kind: 'side' });
  legs.push([x0 + 10, bottom, 8, 12], [x0 + total - 18, bottom, 8, 12]);
  return { parts, legs };
}

const fabricTex: Record<string, { freq: string; oct: number; strength: number; sheen: number }> = {
  classique: { freq: '0.9', oct: 2, strength: 0.22, sheen: 0.12 }, velours: { freq: '0.35', oct: 3, strength: 0.18, sheen: 0.3 },
  microfibre: { freq: '1.4', oct: 1, strength: 0.12, sheen: 0.16 }, boucle: { freq: '0.22', oct: 4, strength: 0.5, sheen: 0.06 },
  lin: { freq: '0.9 0.06', oct: 2, strength: 0.32, sheen: 0.08 }, coton: { freq: '0.8', oct: 2, strength: 0.2, sheen: 0.08 },
  synthetique: { freq: '1.1', oct: 1, strength: 0.15, sheen: 0.14 }, cuir: { freq: '0.05', oct: 2, strength: 0.15, sheen: 0.42 },
  autre: { freq: '0.9', oct: 2, strength: 0.2, sheen: 0.12 }, inconnu: { freq: '0.9', oct: 2, strength: 0.2, sheen: 0.12 },
};

export function FurnitureSvg({ cfg, dirty = false, className, label }: { cfg: Configuration; dirty?: boolean; className?: string; label?: string }) {
  const id = useId().replace(/:/g, ''); const { parts, legs } = geometry(cfg);
  const hex = colors.find(c => c.id === cfg.color)?.hex ?? '#a9a49a'; const t = fabricTex[cfg.fabric] ?? { freq: '0.9', oct: 2, strength: 0.2, sheen: 0.12 };
  const shade: Record<Part['kind'], number> = { back: -0.08, base: -0.22, arm: 0.02, seat: 0.06, cushion: 0.0, deco: 0.1, side: -0.16 };
  return (
    <svg viewBox="0 0 600 340" className={className} role="img" aria-label={label ?? `${typeInfo(cfg.type).label}${dirty ? ', avant nettoyage' : ''}`}>
      <defs>
        <filter id={`tx${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={t.freq} numOctaves={t.oct} seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${t.strength} 0`} result="a" />
          <feComposite in="a" in2="SourceAlpha" operator="in" result="m" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="m" /></feMerge>
        </filter>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={t.sheen} /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></linearGradient>
        <radialGradient id={`fl${id}`}><stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <filter id={`bl${id}`}><feGaussianBlur stdDeviation="7" /></filter>
        <clipPath id={`cp${id}`}>{parts.map((p, i) => <path key={i} d={p.d} />)}</clipPath>
      </defs>
      <ellipse cx="300" cy="300" rx="270" ry="26" fill={`url(#fl${id})`} />
      {legs.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#3b3128" />)}
      <g filter={`url(#tx${id})`} style={{ transition: 'fill .35s ease' }}>
        {parts.map((p, i) => <g key={i}>
          <path d={p.d} fill={hex} style={{ transition: 'fill .35s ease' }} />
          <path d={p.d} fill={shade[p.kind] < 0 ? '#000' : '#fff'} opacity={Math.abs(shade[p.kind])} />
          <path d={p.d} fill={`url(#lg${id})`} />
          <path d={p.d} fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="1.2" strokeDasharray={p.kind === 'cushion' || p.kind === 'seat' ? '3 3' : undefined} />
        </g>)}
      </g>
      {dirty && <g clipPath={`url(#cp${id})`}>
        <rect width="600" height="340" fill="#6d6152" opacity=".26" style={{ mixBlendMode: 'multiply' }} />
        <g filter={`url(#bl${id})`} fill="#4b3f30" opacity=".35">
          <ellipse cx="250" cy="215" rx="34" ry="12" /><ellipse cx="350" cy="208" rx="22" ry="9" /><ellipse cx="300" cy="150" rx="60" ry="24" opacity=".5" /><ellipse cx="160" cy="210" rx="18" ry="30" /><ellipse cx="440" cy="205" rx="18" ry="30" />
        </g>
        <circle cx="318" cy="218" r="5" fill="#3a2e22" opacity=".35" /><circle cx="205" cy="224" r="3" fill="#3a2e22" opacity=".3" />
      </g>}
    </svg>
  );
}
