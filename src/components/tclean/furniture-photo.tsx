import { useId } from 'react';
import { colors, soilLabels, typeInfo, type Configuration, type FurnitureType } from '@/lib/configurator';
import sofa2 from '@/assets/furniture-sofa2.webp';
import sofa3 from '@/assets/furniture-sofa3.webp';
import sofa4 from '@/assets/furniture-sofa4.webp';
import angleLeft from '@/assets/furniture-angleLeft.webp';
import angleRight from '@/assets/furniture-angleRight.webp';
import panoramic from '@/assets/furniture-panoramic.webp';
import convertible from '@/assets/furniture-convertible.webp';
import armchair from '@/assets/furniture-armchair.webp';
import meridienne from '@/assets/furniture-meridienne.webp';
import mattress1 from '@/assets/furniture-mattress1.webp';
import mattress2 from '@/assets/furniture-mattress2.webp';
import chair from '@/assets/furniture-chair.webp';
import cushion from '@/assets/furniture-cushion.webp';
import pouf from '@/assets/furniture-pouf.webp';
import cat from '@/assets/configurator-cat.png';
import dog from '@/assets/configurator-dog.png';

const photos: Record<FurnitureType, string> = { sofa2, sofa3, sofa4, angleLeft, angleRight, panoramic, convertible, armchair, meridienne, mattress1, mattress2, chair, sofa5: sofa4, pouf, cushion };
const dirtStrength = { light: 0.09, moderate: 0.3, heavy: 0.62 };

/** Photographic assets retain their alpha silhouette, lighting and fabric detail. */
export function FurniturePhoto({ cfg, dirty = false, className, label, compact = false }: { cfg: Configuration; dirty?: boolean; className?: string; label?: string; compact?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const photo = photos[cfg.type];
  const info = typeInfo(cfg.type);
  const upholstered = info.family === 'sofa' || info.family === 'armchair';
  const color = colors.find(c => c.id === cfg.color)?.hex ?? colors[0].hex;
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
  const matrix = rgb.map(v => `${0.3 * v} ${0.59 * v} ${0.11 * v} 0 ${0.14 * v}`).join(' ') + ' 0 0 0 1 0';
  const state = dirty ? [soilLabels[cfg.soil], cfg.stains && 'taches visibles', cfg.odors && 'odeurs signalées', cfg.pets && 'poils d’animaux', upholstered && cfg.removable && 'coussin détaché'].filter(Boolean).join(', ') : 'mobilier propre, illustration';
  const strength = dirtStrength[cfg.soil];
  return <svg viewBox="0 0 600 380" className={className} role="img" aria-label={label ?? `${info.label} — ${state}`} data-soil={dirty ? cfg.soil : 'clean'} data-stains={dirty && cfg.stains} data-pets={dirty && cfg.pets} data-odors={dirty && cfg.odors} data-removable={!compact && upholstered && cfg.removable}>
    <defs>
      <filter id={`tone-${id}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={matrix} /></filter>
      <filter id={`blur-${id}`}><feGaussianBlur stdDeviation="7" /></filter>
      <filter id={`grain-${id}`}><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="3" seed="8" /><feColorMatrix type="matrix" values="0 0 0 0 .24 0 0 0 0 .19 0 0 0 0 .12 0 0 0 .35 0" /></filter>
      <mask id={`body-${id}`} mask-type="alpha"><image href={photo} width="600" height="380" /></mask>
    </defs>
    <image href={photo} width="600" height="380" filter={`url(#tone-${id})`} />
    {cfg.fabric !== 'classique' && <g mask={`url(#body-${id})`} opacity={cfg.fabric === 'boucle' ? 0.25 : 0.1} className={`photo-texture tex-${cfg.fabric}`}>
      <rect width="600" height="380" filter={`url(#grain-${id})`} />
      {cfg.fabric === 'lin' && Array.from({ length: 80 }, (_, i) => <path key={i} d={`M0 ${i * 5}H600`} className="photo-weave" />)}
    </g>}
    {dirty && <g mask={`url(#body-${id})`}>
      <g opacity={strength} data-effect="soil">
        <rect width="600" height="380" className="photo-dust" opacity=".35" />
        <rect width="600" height="380" filter={`url(#grain-${id})`} />
        <g filter={`url(#blur-${id})`} className="photo-grime">
          <ellipse cx="210" cy="265" rx="68" ry="27" /><ellipse cx="390" cy="259" rx="65" ry="26" />
          <ellipse cx="150" cy="191" rx="40" ry="42" /><ellipse cx="435" cy="190" rx="45" ry="48" />
          <ellipse cx="298" cy="215" rx="45" ry="40" />
        </g>
      </g>
      {cfg.stains && <g className="photo-stains" data-effect="stains">
        <ellipse cx="203" cy="258" rx="18" ry="7" />
        <ellipse cx="368" cy="253" rx="13" ry="6" opacity=".65" />
      </g>}
    </g>}
    {dirty && cfg.pets && <g data-effect="pets" aria-label="Chat et chien sur le mobilier">
      <g className="photo-pet photo-cat"><image href={cat} x="145" y="156" width="116" height="83" /></g>
      <g className="photo-pet photo-dog"><image href={dog} x="312" y="153" width="137" height="91" /></g>
    </g>}
    {!compact && cfg.pouf && <image href={pouf} x="435" y="263" width="140" height="105" filter={`url(#tone-${id})`} />}
    {!compact && upholstered && cfg.removable && <g data-effect="removable">
      <path d="M415 254q64-12 65 49" className="photo-cushion-guide" />
      <image href={cushion} x="407" y="285" width="135" height="85" filter={`url(#tone-${id})`} />
    </g>}
    {dirty && cfg.odors && <g className="photo-odor" data-effect="odors" aria-hidden="true">
      {[245, 295, 345].map((x, i) => <path key={x} style={{ animationDelay: `${i * .25}s` }} d={`M${x} 132c-18-19 19-24 0-44s-13-28 0-41`} />)}
    </g>}
  </svg>;
}