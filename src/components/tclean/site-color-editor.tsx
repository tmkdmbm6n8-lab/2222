import { useEffect, useState, type MouseEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { saveSiteColors } from '@/lib/business.functions';
import { siteColorCss, themeTokens, type ElementColors } from '@/lib/site-colors';
import type { BusinessConfig } from '@/lib/business';

export type ColorTarget = { key: string; label: string; initial: ElementColors };

function asHex(value: string) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#000000';
  ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  return `#${Array.from(pixel.slice(0, 3)).map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

export function SiteColorEditor({ config, pathname, target, onClose }: { config: BusinessConfig; pathname: string; target: ColorTarget | 'theme'; onClose: () => void }) {
  const [theme, setTheme] = useState({ ...config.themeColors });
  const [element, setElement] = useState<ElementColors>(target === 'theme' ? {} : { ...config.elementColors[target.key] });
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSiteColors); const qc = useQueryClient();
  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    setDefaults(Object.fromEntries(themeTokens.map(([key]) => [key, asHex(root.getPropertyValue(`--${key}`).trim())])));
  }, []);
  const colors = target === 'theme' ? theme : element;
  const rows = target === 'theme' ? themeTokens : [['color', 'Texte et icônes'], ['background-color', 'Fond'], ['border-color', 'Bordure']] as const;
  const submit = async (reset = false) => {
    setBusy(true);
    try {
      await save({ data: target === 'theme' ? { kind: 'theme', colors: reset ? {} : theme } : { kind: 'element', key: target.key, colors: reset ? null : element } });
      await qc.invalidateQueries({ queryKey: ['business'] });
      toast.success('Couleurs enregistrées.'); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const previewElements = target === 'theme' ? config.elementColors : { ...config.elementColors, [target.key]: element };
  return <div className="editor-backdrop" onClick={() => { if (!busy) onClose(); }}>
    <style>{siteColorCss(target === 'theme' ? theme : config.themeColors, previewElements, pathname)}</style>
    <section className="editor-dialog editor-colors-dialog" role="dialog" aria-modal="true" aria-labelledby="color-dialog-title" onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="editor-close" aria-label="Fermer les couleurs" disabled={busy} onClick={onClose}><X size={18} /></Button>
      <h3 id="color-dialog-title">{target === 'theme' ? 'Couleurs du site' : `Couleurs — ${target.label}`}</h3>
      <div className="editor-color-list">{rows.map(([key, label]) => {
        const modified = key in (colors as Record<string, string>);
        const color = (colors as Record<string, string>)[key] ?? (target === 'theme' ? defaults[key] : target.initial[key as keyof ElementColors]) ?? '#000000';
        const resetOne = (event: MouseEvent) => {
          event.preventDefault(); event.stopPropagation();
          if (busy) return;
          if (target === 'theme') setTheme(v => { const next = { ...v }; delete next[key]; return next; });
          else setElement(v => { const next = { ...v }; delete next[key as keyof ElementColors]; return next; });
        };
        return <label className="editor-color-row" key={key}><span>{label}</span><input aria-label={label} type="color" value={color} disabled={busy} onChange={e => target === 'theme' ? setTheme(v => ({ ...v, [key]: e.target.value })) : setElement(v => ({ ...v, [key]: e.target.value }))} /><code>{color.toUpperCase()}</code><button type="button" className="editor-color-default" aria-label={`Rétablir ${label} par défaut`} title="Défaut" disabled={busy || !modified} onClick={resetOne}><RotateCcw size={13} /></button></label>;
      })}</div>
      <div className="editor-actions"><Button variant="outline" disabled={busy} onClick={() => submit(true)}><RotateCcw size={15} />Couleurs d’origine</Button><Button variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button disabled={busy} onClick={() => submit()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
    </section>
  </div>;
}

export function readElementColors(element: Element): ElementColors {
  const css = getComputedStyle(element);
  return { color: asHex(css.color), 'background-color': asHex(css.backgroundColor), 'border-color': asHex(css.borderColor) };
}