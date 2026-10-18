import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';
import { History, Users, Shield, UserRound, Link2, Palette, Pencil, RotateCcw, Trash2, X, Move, ImagePlus, Image, Pipette, Eraser, FileX2, PanelsTopLeft, Clapperboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, AlignLeft, AlignCenter, AlignRight, Monitor, Tablet, Smartphone, Moon, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { businessQuery } from '@/lib/business-query';
import { defaultConfig } from '@/lib/business';
import { saveOverride, saveSiteColors, uploadSiteImage, restoreEditorHistory, permanentlyDeleteHidden, permanentlyDeletePage, prepareInterventionMedia, saveBusiness, setPageEnabled } from '@/lib/business.functions';
import { siteMediaSchema } from '@/lib/interventions';
import { Button } from '@/components/ui/button';
import { elementColorKey, siteColorCss, type ElementColors, type PlacedMedia } from '@/lib/site-colors';
import { SiteColorEditor, readElementColors, type ColorTarget } from './site-color-editor';
import { fontOptions, readTypography, typographyCss, setTextRange, textSegments, type Typography } from '@/lib/site-typography';
import { Input } from '@/components/ui/input';

const MANAGEABLE_PAGES = [
  { path: "/a-propos", label: "À propos" },
  { path: "/avis", label: "Avis clients" },
  { path: "/conditions", label: "Conditions générales" },
  { path: "/configurateur", label: "Configurateur de canapé" },
  { path: "/confidentialite", label: "Confidentialité" },
  { path: "/contact", label: "Messagerie / Contact" },
  { path: "/cookies", label: "Cookies" },
  { path: "/devis", label: "Demande de devis" },
  { path: "/faq", label: "Questions fréquentes" },
  { path: "/mentions-legales", label: "Mentions légales" },
  { path: "/prestations", label: "Prestations" },
  { path: "/realisations", label: "Réalisations" },
  { path: "/reservation", label: "Réservation" },
  { path: "/sav", label: "Service après-vente" },
  { path: "/tarifs", label: "Tarifs" },
  { path: "/zone-intervention", label: "Zone d’intervention" },
] as const;

function applyMedia(map: Record<string, PlacedMedia>, pathname: string) {
  const wanted = new Set<string>();
  for (const [key, m] of Object.entries(map)) {
    const [path, selector] = key.split('|'); if (path !== pathname || !selector) continue;
    let host: Element | null = null; try { host = document.querySelector(selector); } catch { continue; }
    if (!(host instanceof HTMLElement)) continue;
    // The homepage hero uses its own cleaning video; never layer an uploaded image/video over it.
    if (host.matches('.hero') || host.closest('.hero')) continue;
    const id = `${key}#${m.url}#${m.layer}#${m.opacity}`; wanted.add(id);
    if (document.querySelector(`tclean-media[data-id="${CSS.escape(id)}"]`)) continue;
    const box = document.createElement('tclean-media'); box.dataset['id'] = id; box.className = `tclean-media tclean-media-${m.layer}`; box.style.opacity = String(m.opacity);
    const el = document.createElement(m.type === 'video' ? 'video' : 'img');
    el.setAttribute('src', m.url);
    if (el instanceof HTMLVideoElement) { el.muted = true; el.autoplay = true; el.loop = true; el.playsInline = true; el.setAttribute('muted', ''); void el.play().catch(() => {}); } else el.setAttribute('alt', '');
    box.appendChild(el);
    if (m.layer === 'before') host.before(box); else if (m.layer === 'after') host.after(box);
    else { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; if (m.layer === 'behind') host.style.isolation = 'isolate'; host.prepend(box); }
  }
  document.querySelectorAll<HTMLElement>('tclean-media').forEach(b => { if (!wanted.has(b.dataset['id'] ?? '')) b.remove(); });
}
const original = new WeakMap<Text, string>();
const applied = new WeakMap<Text, string>();
const wrapped = new Map<HTMLElement, { node: Text; value: string }>();
function unwrapText() {
  for (const [wrapper, { node, value }] of wrapped) {
    if (wrapper.isConnected) { node.nodeValue = value; wrapper.replaceWith(node); }
  }
  wrapped.clear();
}
function applyRanges(values: Record<string, string>) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes: Text[] = [];
  while (walker.nextNode()) if (!isUi(walker.currentNode)) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const key = (original.get(node) ?? node.nodeValue ?? '').trim();
    const ranges = readTypography(values[key]).ranges ?? []; if (!ranges.length || !node.parentNode) continue;
    const value = node.nodeValue ?? ''; const leading = value.length - value.trimStart().length;
    const segments = textSegments(value, ranges.map(r => ({ ...r, start: r.start + leading, end: r.end + leading })));
    if (!segments.some(s => s.index !== undefined)) continue;
    const wrapper = document.createElement('span'); wrapper.dataset['tcleanTextWrapper'] = key;
    node.replaceWith(wrapper); wrapped.set(wrapper, { node, value });
    for (const segment of segments) {
      const part = document.createElement('span'); part.textContent = segment.text;
      if (segment.index !== undefined) part.dataset['tcleanRange'] = `${encodeURIComponent(key).replace(/'/g, '%27')}:${segment.index}`;
      wrapper.append(part);
    }
  }
}
const isUi = (n: Node | null) => !!(n && (n instanceof Element ? n : n.parentElement)?.closest('[data-editor-ui],script,style,head'));

function applyAll(content: Record<string, string>, images: Record<string, string>) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null; const claimed = new Set<Element>();
  while ((node = walker.nextNode())) {
    const t = node as Text; if (isUi(t)) continue;
    if (applied.get(t) !== t.nodeValue) original.set(t, t.nodeValue ?? '');
    const orig = original.get(t) ?? ''; const key = orig.trim(); if (!key) continue;
    const parent = t.parentElement;
    if (parent && !claimed.has(parent)) { claimed.add(parent); const attr = encodeURIComponent(key).replace(/'/g, '%27'); if (parent.getAttribute('data-tclean-typography') !== attr) parent.setAttribute('data-tclean-typography', attr); }
    const next = content[key] !== undefined ? orig.replace(key, content[key]) : orig;
    if (t.nodeValue !== next) t.nodeValue = next;
    applied.set(t, next);
  }
  document.querySelectorAll('img').forEach(img => {
    if (isUi(img)) return;
    const cur = img.getAttribute('src') ?? '';
    if (!img.dataset['origSrc'] || (cur !== img.dataset['appliedSrc'])) img.dataset['origSrc'] = cur;
    const target = images[img.dataset['origSrc']] ?? img.dataset['origSrc'];
    if (cur !== target) { img.setAttribute('src', target); img.removeAttribute('srcset'); }
    img.dataset['appliedSrc'] = target;
  });
}

function useIsAdmin() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  const q = useQuery({ queryKey: ['is-admin', uid], enabled: !!uid, queryFn: async () => { if (!uid) return false; return (await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' })).data === true; } });
  return !!uid && q.data === true;
}

const clickable = (el: Element | null) => el?.closest('a,button') as HTMLElement | null;
function linkKey(el: HTMLElement) {
  const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const href = el instanceof HTMLAnchorElement ? (el.dataset['origHref'] ?? el.getAttribute('href') ?? '') : 'button';
  return label ? `${label}|${href}`.slice(0, 400) : null;
}
function applyLinks(links: Record<string, string>) {
  document.querySelectorAll('a').forEach(a => {
    if (isUi(a)) return; const cur = a.getAttribute('href') ?? '';
    if (a.dataset['origHref'] === undefined || cur !== a.dataset['appliedHref']) a.dataset['origHref'] = cur;
    const k = linkKey(a); const target = (k && links[k]) || a.dataset['origHref'];
    if (cur !== target) a.setAttribute('href', target);
    a.dataset['appliedHref'] = target;
  });
}
const PENDING = 'tclean-pending-link';
const HIDEABLE = 'a,button,img,h1,h2,h3,h4,p,li,article';
function hideKey(el: Element) {
  if (el instanceof HTMLImageElement) { const s = el.dataset['origSrc'] ?? el.getAttribute('src') ?? ''; return s ? `img:${s}`.slice(0, 2000) : null; }
  if (el.matches('a,button')) { const k = linkKey(el as HTMLElement); return k ? `btn:${k}` : null; }
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  return text ? `${el.localName}:${text}` : null;
}
function applyHidden(hidden: Record<string, string>, permanentHidden: Record<string, boolean> = {}) {
  document.querySelectorAll(HIDEABLE).forEach(el => {
    if (isUi(el)) return;
    const k = hideKey(el);
    const isPermanent = !!k && permanentHidden[k] === true;
    if (isPermanent) {
      el.setAttribute('data-tclean-hidden', '');
      el.setAttribute('data-tclean-permanent-hidden', '');
    } else if (k && hidden[k] !== undefined) {
      el.setAttribute('data-tclean-hidden', '');
      el.removeAttribute('data-tclean-permanent-hidden');
    } else {
      el.removeAttribute('data-tclean-hidden');
      el.removeAttribute('data-tclean-permanent-hidden');
    }
  });
}
const hiddenCss = '[data-tclean-hidden]{display:none!important}body.site-editing [data-tclean-hidden]:not([data-tclean-permanent-hidden]){display:revert!important;opacity:.35!important;outline:2px dashed var(--destructive)!important}body.site-editing [data-tclean-permanent-hidden]{display:none!important}';
type HiddenInfo = { label: string; page: string; at: string };
const parseInfo = (v: string): HiddenInfo => { try { return JSON.parse(v) as HiddenInfo; } catch { return { label: v, page: '', at: '' }; } };

type Audience = 'all' | 'admin' | 'client';
const AUD_LABEL: Record<Audience, string> = { all: 'Pour tout le monde', admin: 'Admin uniquement', client: 'Clients et visiteurs uniquement' };

type Target = { kind: 'text'; key: string; tkey?: string; value: string } | { kind: 'image'; key: string; tkey?: undefined };

export function SiteEditor() {
  const { data: c } = useSuspenseQuery(businessQuery);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isAdmin = useIsAdmin(); const isPreviewFrame = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tclean-preview'); const [on, setOn] = useState(false); const [toolsOpen, setToolsOpen] = useState(false);
  const [audience, setAudience] = useState<Audience>('all'); const [askAudience, setAskAudience] = useState(false);
  const viewer: 'admin' | 'client' = on && isAdmin ? (audience === 'admin' ? 'admin' : 'client') : (isAdmin ? 'admin' : 'client');
  const audMap = ((c as { audience?: Record<string, string> }).audience ?? {});
  const filt = (kind: string, m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([k]) => { const a = audMap[`${kind}:${k}`]; return !a || a === viewer; }));
  const content = filt('text', (c.content ?? {}) as Record<string, string>); const images = filt('image', (c.images ?? {}) as Record<string, string>); const [target, setTarget] = useState<Target | null>(null); const [draft, setDraft] = useState(''); const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'content' | 'colors' | 'link' | 'delete' | 'permanent-delete' | 'move' | 'media'>('content');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile' | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('tclean-dark-mode', darkMode); return () => document.documentElement.classList.remove('tclean-dark-mode'); }, [darkMode]);
  const [moveTarget, setMoveTarget] = useState<{ key: string; label: string } | null>(null);
  const [moveDraft, setMoveDraft] = useState<ElementColors>({});
  const [mediaTarget, setMediaTarget] = useState<{ key: string; label: string } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaLayer, setMediaLayer] = useState<PlacedMedia['layer']>('behind');
  const [mediaOpacity, setMediaOpacity] = useState(1);
  const typography = filt('typography', c.typography ?? {});
  const [writing, setWriting] = useState<Typography>({ font: 'site', size: null });
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [rangeWriting, setRangeWriting] = useState<Typography>({ font: 'site', size: null });
  const [rangeColor, setRangeColor] = useState<string | null>(null);
  const [historyCategory, setHistoryCategory] = useState('Tout');
  const categoryOf = (label: string) => label.startsWith('Texte —') ? 'Textes' : label.startsWith('Photo —') ? 'Photos' : label.startsWith('Couleurs') ? 'Couleurs' : label.startsWith('Suppression') ? 'Suppressions' : label.startsWith('Redirection') ? 'Redirections' : label.startsWith('Taille') ? 'Écriture' : 'Autres';
  const previewWriting = () => selection ? { ...writing, ranges: setTextRange(writing.ranges ?? [], { ...rangeWriting, start: selection.start, end: selection.end, text: draft.slice(selection.start, selection.end), color: rangeColor }) } : writing;
  const activeTypography = target?.kind === 'text' ? { ...typography, [target.key]: JSON.stringify(previewWriting()) } : typography;
  const router = useRouter(); const links = filt('link', (c.links ?? {}) as Record<string, string>);
  const allHidden = ((c as { hidden?: Record<string, string> }).hidden ?? {}); const hidden = filt('hide', allHidden); const permanentHidden = ((c as { permanentHidden?: Record<string, boolean> }).permanentHidden ?? {});
  const legacyHidden = Object.entries(c.elementColors ?? {}).filter(([, v]) => v.display === 'none');
  const editHistory = c.editHistory ?? [];
  const historyCount = editHistory.length + Object.keys(allHidden).length + legacyHidden.length;
  const [showHistory, setShowHistory] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);
  const [showPermanentPageManager, setShowPermanentPageManager] = useState(false);
  const [pending, setPending] = useState<{ key: string; label: string } | null>(null);
  useEffect(() => { try { const v = sessionStorage.getItem(PENDING); if (v) { setPending(JSON.parse(v)); setOn(true); } } catch { /* ignore */ } }, []);
  const choosePending = (p: { key: string; label: string } | null) => { setPending(p); if (p) sessionStorage.setItem(PENDING, JSON.stringify(p)); else sessionStorage.removeItem(PENDING); };
  useEffect(() => {
    let raf = 0; const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => applyLinks(links)); };
    run(); const obs = new MutationObserver(run); obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || document.body.classList.contains('site-editing')) return; const el = clickable(e.target as Element); if (!el || isUi(el)) return;
      const k = linkKey(el); const to = k ? links[k] : undefined; if (!to) return;
      e.preventDefault(); e.stopPropagation(); router.history.push(to);
    };
    document.addEventListener('click', onClick, true);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('click', onClick, true); };
  }, [links, pathname, router]);
  const [colorTarget, setColorTarget] = useState<ColorTarget | 'theme' | null>(null);
  const qc = useQueryClient(); const save = useServerFn(saveOverride); const saveColors = useServerFn(saveSiteColors); const upload = useServerFn(uploadSiteImage); const fileRef = useRef<HTMLInputElement>(null); const heroMediaRef = useRef<HTMLInputElement>(null); const saveBusinessConfig = useServerFn(saveBusiness);
  const restore = useServerFn(restoreEditorHistory); const prepareMedia = useServerFn(prepareInterventionMedia); const changePageEnabled = useServerFn(setPageEnabled); const deletePagePermanently = useServerFn(permanentlyDeletePage);
  const placed = (c as { media?: Record<string, PlacedMedia> }).media ?? {};
  useEffect(() => {
    let raf = 0; const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { obs.disconnect(); applyMedia(placed, pathname); obs.observe(document.body, { subtree: true, childList: true }); }); };
    const obs = new MutationObserver(run); run();
    return () => { obs.disconnect(); cancelAnimationFrame(raf); document.querySelectorAll('tclean-media').forEach(b => b.remove()); };
  }, [placed, pathname]);
  const saveMedia = async (remove = false) => {
    if (!mediaTarget) return; const key = mediaTarget.key; const cur = placed[key];
    await run(async () => {
      if (remove) { await saveColors({ data: { kind: 'media', key, media: null } }); return; }
      let url = cur?.url; let type = cur?.type;
      if (mediaFile) {
        const info = siteMediaSchema.parse({ type: mediaFile.type, size: mediaFile.size });
        const signed = await prepareMedia({ data: info });
        const up = await supabase.storage.from('site-images').uploadToSignedUrl(signed.path, signed.token, mediaFile, { contentType: mediaFile.type });
        if (up.error) throw new Error('Envoi du fichier impossible.');
        url = signed.url; type = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }
      if (!url || !type) throw new Error('Choisissez une photo ou une vidéo.');
      await saveColors({ data: { kind: 'media', key, media: { url, type, layer: mediaLayer, opacity: mediaOpacity } } });
    });
    setMediaTarget(null); setMediaFile(null);
  };

  useEffect(() => {
    let raf = 0;
    const options = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src'] };
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { obs.disconnect(); unwrapText(); applyAll(content, images); applyRanges(activeTypography); applyHidden(hidden, permanentHidden); obs.observe(document.body, options); }); };
    const obs = new MutationObserver(run); run(); obs.observe(document.body, options);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); unwrapText(); };
  }, [content, images, hidden, permanentHidden, pathname, activeTypography]);

  useEffect(() => {
    if (!on || !isAdmin || pending) return; document.body.classList.add('site-editing');
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element; if (isUi(el)) return;
      e.preventDefault(); e.stopPropagation();
      if (mode === 'link') {
        const btn = clickable(el); const key = btn && linkKey(btn);
        if (!btn || !key) { toast.error('Cliquez sur un bouton ou un lien.'); return; }
        choosePending({ key, label: key.split('|')[0] ?? '' }); toast('Naviguez librement jusqu’à la page voulue, puis cliquez sur « Rediriger ici ».');
        return;
      }
      if (mode === 'permanent-delete') {
        let selected = el.closest(HIDEABLE) ?? el;
        let key = hideKey(selected);
        let ancestor = selected.parentElement;
        while ((!key || allHidden[key] === undefined || permanentHidden[key]) && ancestor && ancestor !== document.body) {
          const candidate = hideKey(ancestor);
          if (candidate && allHidden[candidate] !== undefined && !permanentHidden[candidate]) { selected = ancestor; key = candidate; break; }
          ancestor = ancestor.parentElement;
        }
        if (!key || allHidden[key] === undefined || permanentHidden[key]) {
          toast.error('Cliquez sur un élément grisé qui a déjà été supprimé.');
          return;
        }
        const info = parseInfo(allHidden[key]);
        if (!window.confirm(`SUPPRESSION DÉFINITIVE : « ${info.label || key} » ne pourra plus être rétabli. Continuer ?`)) return;
        void run(() => permanentlyDeleteHidden({ data: { key } }));
        return;
      }
      if (mode === 'delete') {
        const selected = el.closest(HIDEABLE) ?? el;
        const legacy = elementColorKey(selected, pathname);
        if (legacy && c.elementColors?.[legacy]?.display === 'none') { const cur = { ...c.elementColors[legacy] }; delete cur.display; void run(() => saveColors({ data: { kind: 'element', key: legacy, colors: Object.keys(cur).length ? cur : null } })); return; }
        const key = hideKey(selected); if (!key) { toast.error('Sélectionnez un autre élément.'); return; }
        if (permanentHidden[key]) { toast.error('Cet élément a été supprimé définitivement et ne peut plus être rétabli depuis l’éditeur.'); return; }
        if (hidden[key] !== undefined) { void run(() => save({ data: { kind: 'hide', key, value: null } })); return; }
        if (!window.confirm('Supprimer cet élément sur toutes les pages du site ? Vous pourrez le rétablir depuis l’historique.')) return;
        const label = selected instanceof HTMLImageElement ? `Photo (${selected.alt || 'sans titre'})` : (selected.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
        void run(() => save({ data: { kind: 'hide', key, value: JSON.stringify({ label, page: pathname, at: new Date().toISOString() }), audience } }));
        return;
      }
      if (mode === 'media') {
        const t = el.closest('tclean-media')?.parentElement ?? el; const key = elementColorKey(t, pathname);
        if (!key) { toast.error('Sélectionnez un autre élément.'); return; }
        const cur = placed[key]; setMediaTarget({ key, label: t.textContent?.replace(/\s+/g, ' ').trim().slice(0, 45) || t.localName }); setMediaFile(null); setMediaLayer(cur?.layer ?? 'behind'); setMediaOpacity(cur?.opacity ?? 1);
        return;
      }
      if (mode === 'move') {
        const key = elementColorKey(el, pathname);
        if (!key) { toast.error('Sélectionnez un autre élément.'); return; }
        setMoveTarget({ key, label: el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 45) || el.localName }); setMoveDraft({ ...c.elementColors?.[key] });
        return;
      }
      if (mode === 'colors') {
        const selected = el.closest('button,a') ?? el;
        const key = elementColorKey(selected, pathname);
        if (key) setColorTarget({ key, label: selected.textContent?.trim().slice(0, 45) || selected.localName, initial: readElementColors(selected) });
        else toast.error('Sélectionnez un autre élément.');
        return;
      }
      if (el instanceof HTMLImageElement) { setTarget({ kind: 'image', key: el.dataset['origSrc'] ?? el.getAttribute('src') ?? '' }); return; }
      const wrapper = el.closest<HTMLElement>('[data-tclean-text-wrapper]');
      if (wrapper) {
        const key = wrapper.dataset['tcleanTextWrapper']; if (!key) return;
        setTarget({ kind: 'text', key, tkey: key, value: content[key] ?? key }); setDraft(content[key] ?? key);
        setWriting(readTypography(typography[key])); setSelection(null); return;
      }
      const range = document.caretRangeFromPoint?.(e.clientX, e.clientY); let node = range?.startContainer as Node | undefined;
      if (!node || !el.contains(node) || node.nodeType !== Node.TEXT_NODE || !node.nodeValue?.trim()) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue?.trim()) { node = n; break; } }
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const key = (original.get(node as Text) ?? node.nodeValue ?? '').trim(); if (!key) return;
      const attr = (node as Text).parentElement?.getAttribute('data-tclean-typography');
      let tkey = key; try { if (attr) tkey = decodeURIComponent(attr); } catch { /* keep key */ }
      setTarget({ kind: 'text', key, tkey, value: content[key] ?? key }); setDraft(content[key] ?? key);
      setWriting(readTypography(typography[tkey]));
      setSelection(null);
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); document.body.classList.remove('site-editing'); };
  }, [on, content, mode, pathname, isAdmin, pending, c, typography]);

  const done = async () => { await qc.invalidateQueries({ queryKey: ['business'] }); setTarget(null); toast.success('Modification enregistrée et visible sur le site.'); };
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await done(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(false); } };
  const changeHeroBackground = async (file?: File) => {
    if (!file) return;
    const validation = siteMediaSchema.safeParse({ type: file.type, size: file.size });
    if (!validation.success) {
      toast.error('Limite dépassée : vidéo MP4/WebM/MOV jusqu’à 20 Mo, photo JPG/PNG/WebP jusqu’à 5 Mo.');
      return;
    }
    await run(async () => {
      const signed = await prepareMedia({ data: validation.data });
      const uploaded = await supabase.storage.from('site-images').uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (uploaded.error) throw new Error('Envoi du fichier impossible. Réessayez.');
      await saveBusinessConfig({ data: { ...c, heroPhoto: signed.url } });
    });
  };
  const priceLike = target?.kind === 'text' && /€|\d+\s?km/.test(target.key);

  return <div data-editor-ui>
    <style>{siteColorCss(c.themeColors ?? {}, moveTarget ? { ...(c.elementColors ?? {}), [moveTarget.key]: moveDraft } : (c.elementColors ?? {}), pathname) + hiddenCss + typographyCss(activeTypography)}</style>
    {isAdmin && !isPreviewFrame && <Button className="editor-toggle" aria-expanded={toolsOpen} onClick={() => { if (!on) { setOn(true); setToolsOpen(true); } else { setToolsOpen(v => !v); } setTarget(null); setColorTarget(null); }}><Pencil size={14} />{on ? (toolsOpen ? 'Fermer les outils' : 'Outils d’édition') : 'Mode édition'}</Button>}
    {isAdmin && on && toolsOpen && <div className="editor-tools-menu" data-editor-ui role="dialog" aria-label="Outils du mode édition">
      <div className="editor-tools-heading"><div><strong>Outils d’édition</strong><span>Choisissez une action</span></div><Button size="icon" variant="ghost" aria-label="Fermer les outils" onClick={() => setToolsOpen(false)}><X size={16} /></Button></div>
      <div className="editor-control-bar">
        <div className="editor-audience-switch" role="group" aria-label="Public des modifications">
          <button type="button" className={`editor-audience-option ${audience === 'all' ? 'is-active' : ''}`} aria-label="Tout le monde" title="Tout le monde" aria-pressed={audience === 'all'} onClick={() => setAudience('all')}><UserRound size={15} /><Shield size={15} /></button>
          <button type="button" className={`editor-audience-option ${audience === 'client' ? 'is-active' : ''}`} aria-label="Clients et visiteurs" title="Clients et visiteurs" aria-pressed={audience === 'client'} onClick={() => setAudience('client')}><UserRound size={17} /></button>
          <button type="button" className={`editor-audience-option ${audience === 'admin' ? 'is-active' : ''}`} aria-label="Admin uniquement" title="Admin uniquement" aria-pressed={audience === 'admin'} onClick={() => setAudience('admin')}><Shield size={17} /></button>
        </div>
        <button type="button" className={`editor-theme-switch ${darkMode ? 'is-dark' : ''}`} aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'} aria-pressed={darkMode} title={darkMode ? 'Mode sombre activé' : 'Mode clair activé'} onClick={() => setDarkMode(v => !v)}>
          <Sun size={15} /><span className="editor-theme-switch-track"><span /></span><Moon size={15} />
        </button>
        <div className="editor-device-switch" role="group" aria-label="Aperçu par appareil">
          <button type="button" className={`editor-audience-option ${previewMode === 'desktop' ? 'is-active' : ''}`} aria-label="Ordinateur" title="Ordinateur" aria-pressed={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')}><Monitor size={17} /></button>
          <button type="button" className={`editor-audience-option ${previewMode === 'mobile' ? 'is-active' : ''}`} aria-label="Téléphone" title="Téléphone" aria-pressed={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')}><Smartphone size={17} /></button>
          <button type="button" className={`editor-audience-option ${previewMode === 'tablet' ? 'is-active' : ''}`} aria-label="Tablette" title="Tablette" aria-pressed={previewMode === 'tablet'} onClick={() => setPreviewMode('tablet')}><Tablet size={17} /></button>
        </div>
      </div>
      <div className="editor-tools-grid">
        <button type="button" className="editor-tool" onClick={() => heroMediaRef.current?.click()} disabled={busy}><span className="editor-tool-icon"><Image size={18} /></span><span>Fond d’accueil</span></button>
        <button type="button" className="editor-tool" disabled={busy} onClick={() => run(async () => { await saveBusinessConfig({ data: { ...c, heroPhoto: defaultConfig.heroPhoto } }); for (const [key] of Object.entries(placed)) { const [page, selector] = key.split('|'); if (page !== '/' || !selector) continue; let element: Element | null = null; try { element = document.querySelector(selector); } catch { /* Ignore stale editor selectors. */ } if (element && (element.matches('.hero') || element.closest('.hero'))) await saveColors({ data: { kind: 'media', key, media: null } }); } })}><span className="editor-tool-icon"><RotateCcw size={18} /></span><span>Restaurer la vidéo</span></button>
        <button type="button" className={`editor-tool ${mode === 'content' ? 'is-active' : ''}`} onClick={() => setMode('content')}><span className="editor-tool-icon"><Pencil size={18} /></span><span>Textes et photos</span></button>
        <button type="button" className={`editor-tool ${mode === 'colors' ? 'is-active' : ''}`} onClick={() => setMode('colors')}><span className="editor-tool-icon"><Pipette size={18} /></span><span>Couleur élément</span></button>
        <button type="button" className={`editor-tool ${mode === 'link' ? 'is-active' : ''}`} onClick={() => setMode('link')}><span className="editor-tool-icon"><Link2 size={18} /></span><span>Redirection</span></button>
        <button type="button" className={`editor-tool ${mode === 'delete' ? 'is-active' : ''}`} onClick={() => setMode('delete')}><span className="editor-tool-icon"><Eraser size={18} /></span><span>Supprimer</span></button>
        <button type="button" className={`editor-tool ${mode === 'permanent-delete' ? 'is-active' : ''}`} onClick={() => { setMode('permanent-delete'); setShowPermanentPageManager(true); }}><span className="editor-tool-icon"><FileX2 size={18} /></span><span>Supprimer pour de bon</span></button>
        <button type="button" className={`editor-tool ${mode === 'move' ? 'is-active' : ''}`} onClick={() => setMode('move')}><span className="editor-tool-icon"><Move size={18} /></span><span>Déplacer / centrer</span></button>
        <button type="button" className={`editor-tool ${mode === 'media' ? 'is-active' : ''}`} onClick={() => setMode('media')}><span className="editor-tool-icon"><Clapperboard size={18} /></span><span>Photo / vidéo</span></button>
        <button type="button" className="editor-tool" onClick={() => setShowPageManager(true)}><span className="editor-tool-icon"><PanelsTopLeft size={18} /></span><span>Gérer les pages</span></button>
        <button type="button" className="editor-tool" onClick={() => setShowHistory(true)}><span className="editor-tool-icon"><History size={18} /></span><span>Historique ({historyCount})</span></button>
        
        <button type="button" className="editor-tool" onClick={() => setColorTarget('theme')}><span className="editor-tool-icon"><Palette size={18} /></span><span>Couleurs du site</span></button>
        <button type="button" className="editor-tool editor-tool-exit" onClick={() => { setOn(false); setToolsOpen(false); setTarget(null); setColorTarget(null); }}><span className="editor-tool-icon"><X size={18} /></span><span>Quitter l’édition</span></button>
      </div>
      <input ref={heroMediaRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e => { const file = e.currentTarget.files?.[0]; void changeHeroBackground(file); e.currentTarget.value = ''; }} />
    </div>}
    {isAdmin && on && previewMode && <div className={`editor-preview-overlay editor-preview-${previewMode}`} data-editor-ui>
      <div className="editor-preview-toolbar">
        <strong>Aperçu du site</strong>
        <div className="editor-preview-devices" role="group" aria-label="Taille de l’aperçu">
          <button type="button" className={previewMode === 'desktop' ? 'is-active' : ''} aria-label="Ordinateur" title="Ordinateur" aria-pressed={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')}><Monitor size={18} /></button>
          <button type="button" className={previewMode === 'mobile' ? 'is-active' : ''} aria-label="Téléphone" title="Téléphone" aria-pressed={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')}><Smartphone size={18} /></button>
          <button type="button" className={previewMode === 'tablet' ? 'is-active' : ''} aria-label="Tablette" title="Tablette" aria-pressed={previewMode === 'tablet'} onClick={() => setPreviewMode('tablet')}><Tablet size={18} /></button>
        </div>
        <button type="button" className="editor-preview-close" onClick={() => setPreviewMode(null)}><X size={16} /> Fermer</button>
      </div>
      <div className="editor-preview-stage">
        <iframe key={pathname + previewMode} title={`Aperçu ${previewMode === 'desktop' ? 'ordinateur' : previewMode === 'tablet' ? 'tablette' : 'téléphone'} du site`} src={pathname + (pathname.includes('?') ? '&' : '?') + 'tclean-preview=1'} className="editor-preview-frame" />
      </div>
    </div>}
    {isAdmin && on && askAudience && <div className="editor-backdrop" onClick={() => setAskAudience(false)}><div className="editor-dialog" onClick={e => e.stopPropagation()}>
      <h3>Pour qui sont vos modifications ?</h3>
      <p>Les clients incluent aussi les simples visiteurs, inscrits ou non. Les couleurs s’appliquent toujours à tout le monde.</p>
      <div className="editor-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {(['all', 'client', 'admin'] as Audience[]).map(a => <Button key={a} variant={audience === a ? 'default' : 'outline'} onClick={() => { setAudience(a); setAskAudience(false); }}>{AUD_LABEL[a]}</Button>)}
      </div>
    </div></div>}
    {isAdmin && on && mode === 'media' && !mediaTarget && <div className="editor-redirect"><span>Cliquez sur l’endroit (titre, bloc, section…) où ajouter une photo ou une vidéo.</span></div>}
    {isAdmin && on && mediaTarget && <div className="editor-move-panel">
      <div className="flex items-center justify-between gap-2"><strong className="truncate">Média sur : {mediaTarget.label}</strong><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setMediaTarget(null)}><X size={16} /></Button></div>
      <label className="text-sm grid gap-1">VIDÉO : 20 Mo maximum — PHOTO : 5 Mo maximum{placed[mediaTarget.key] && <small className="text-muted-foreground">Laissez vide pour garder le média actuel.</small>}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e => setMediaFile(e.target.files?.[0] ?? null)} /></label>
      <label className="text-sm grid gap-1">Couche d’affichage<select className="border border-border rounded p-2 bg-background" value={mediaLayer} onChange={e => setMediaLayer(e.target.value as PlacedMedia['layer'])}>
        <option value="behind">Derrière (en fond, sous le texte)</option><option value="front">Devant (par-dessus l’élément)</option><option value="before">Au-dessus de l’élément</option><option value="after">En dessous de l’élément</option>
      </select></label>
      <label className="text-sm grid gap-1">Opacité : {Math.round(mediaOpacity * 100)} %<input type="range" min={0.05} max={1} step={0.05} value={mediaOpacity} onChange={e => setMediaOpacity(Number(e.target.value))} /></label>
      <div className="flex gap-2 justify-end">{placed[mediaTarget.key] && <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveMedia(true)}><Trash2 size={14} />Retirer</Button>}<Button size="sm" disabled={busy} onClick={() => void saveMedia()}>{busy ? 'Envoi…' : 'Enregistrer'}</Button></div>
    </div>}
    {isAdmin && on && mode === 'move' && !moveTarget && <div className="editor-redirect"><span>Cliquez sur un élément (texte, bouton, photo, bloc) pour le déplacer ou le recentrer sur cette page.</span></div>}
    {isAdmin && on && moveTarget && (() => {
      const [x, y] = (moveDraft.translate ?? '0px 0px').split(' ').map(v => parseInt(v, 10) || 0) as [number, number];
      const setPos = (nx: number, ny: number) => setMoveDraft(d => { const n = { ...d }; const cx = Math.max(-2000, Math.min(2000, nx)), cy = Math.max(-2000, Math.min(2000, ny)); if (cx || cy) n.translate = `${cx}px ${cy}px`; else delete n.translate; return n; });
      const align = (a: 'left' | 'center' | 'right') => setMoveDraft(d => ({ ...d, 'text-align': a, 'margin-left': a === 'left' ? '0px' : 'auto', 'margin-right': a === 'right' ? '0px' : 'auto', 'justify-content': a === 'left' ? 'flex-start' : a === 'center' ? 'center' : 'flex-end' }));
      const clean = () => { const n: ElementColors = { ...moveDraft }; return Object.keys(n).length ? n : null; };
      return <div className="editor-move-panel">
        <div className="flex items-center justify-between gap-2"><strong className="truncate">Déplacer : {moveTarget.label}</strong><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setMoveTarget(null)}><X size={16} /></Button></div>
        <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
          <span /><Button size="icon" variant="outline" aria-label="Monter" onClick={() => setPos(x, y - 10)}><ArrowUp size={16} /></Button><span />
          <Button size="icon" variant="outline" aria-label="Gauche" onClick={() => setPos(x - 10, y)}><ArrowLeft size={16} /></Button><Button size="icon" variant="outline" aria-label="Position d’origine" onClick={() => setPos(0, 0)}><RotateCcw size={16} /></Button><Button size="icon" variant="outline" aria-label="Droite" onClick={() => setPos(x + 10, y)}><ArrowRight size={16} /></Button>
          <span /><Button size="icon" variant="outline" aria-label="Descendre" onClick={() => setPos(x, y + 10)}><ArrowDown size={16} /></Button><span />
        </div>
        <div className="flex gap-2 items-center text-sm"><label className="flex items-center gap-1">X <Input type="number" className="w-20 h-8" value={x} onChange={e => setPos(Number(e.target.value), y)} /></label><label className="flex items-center gap-1">Y <Input type="number" className="w-20 h-8" value={y} onChange={e => setPos(x, Number(e.target.value))} /></label><span className="text-muted-foreground">px</span></div>
        <div className="flex gap-1"><Button size="sm" variant={moveDraft['text-align'] === 'left' ? 'secondary' : 'outline'} onClick={() => align('left')}><AlignLeft size={14} />Gauche</Button><Button size="sm" variant={moveDraft['text-align'] === 'center' ? 'secondary' : 'outline'} onClick={() => align('center')}><AlignCenter size={14} />Centrer</Button><Button size="sm" variant={moveDraft['text-align'] === 'right' ? 'secondary' : 'outline'} onClick={() => align('right')}><AlignRight size={14} />Droite</Button></div>
        <div className="flex gap-2 justify-end"><Button size="sm" variant="outline" disabled={busy} onClick={() => setMoveDraft(d => { const n = { ...d }; for (const k of ['translate', 'text-align', 'margin-left', 'margin-right', 'justify-content'] as const) delete n[k]; return n; })}>Tout annuler</Button><Button size="sm" disabled={busy} onClick={() => { const key = moveTarget.key; void run(() => saveColors({ data: { kind: 'element', key, colors: clean() } })).then(() => setMoveTarget(null)); }}>Enregistrer</Button></div>
      </div>;
    })()}
    {isAdmin && on && mode === 'delete' && <div className="editor-redirect"><span>Cliquez sur un élément pour le supprimer <strong>sur toutes les pages du site</strong>. Il reste visible ici en pointillés rouges : cliquez dessus pour le rétablir, ou utilisez « Historique ».</span></div>}
    {isAdmin && on && mode === 'permanent-delete' && <div className="editor-redirect"><span>Cliquez sur un élément grisé déjà supprimé pour le <strong>supprimer définitivement</strong>. Il ne pourra plus être rétabli. Cette action est séparée de l’historique.</span></div>}
    {isAdmin && on && showPermanentPageManager && <div className="editor-backdrop" onClick={() => setShowPermanentPageManager(false)}><div className="editor-dialog editor-pages-dialog" onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="editor-close" aria-label="Fermer" onClick={() => setShowPermanentPageManager(false)}><X size={16} /></Button>
      <h3>Supprimer une page pour de bon</h3>
      <p>Choisis la page directement dans son aperçu. Seules les pages déjà désactivées sont proposées.</p>
      <div className="editor-page-grid">
        {MANAGEABLE_PAGES.filter(page => ((c as typeof c & { disabledPages?: string[] }).disabledPages ?? []).includes(page.path)).map(page => {
          const permanentlyDeleted = ((c as typeof c & { permanentlyDeletedPages?: string[] }).permanentlyDeletedPages ?? []).includes(page.path);
          return <article className="editor-page-card" key={page.path}>
            <div className="editor-page-preview"><iframe loading="lazy" title="Aperçu de page" src={page.path + "?tclean-preview=1"} tabIndex={-1} aria-hidden="true" /><span className={permanentlyDeleted ? "editor-page-status is-deleted" : "editor-page-status"}>{permanentlyDeleted ? "Supprimée" : "Désactivée"}</span></div>
            <div className="editor-page-actions">
              {permanentlyDeleted ? <span className="editor-page-done">Suppression effectuée</span> : <button type="button" className="editor-page-action is-danger" aria-label="Supprimer définitivement cette page" title="Supprimer définitivement" disabled={busy} onClick={() => {
                if (!window.confirm("SUPPRESSION DÉFINITIVE : cette page ne pourra plus être restaurée depuis l’éditeur. Continuer ?")) return;
                void run(async () => { await deletePagePermanently({ data: { path: page.path } }); setShowPermanentPageManager(false); });
              }}><FileX2 size={17} /></button>}
            </div>
          </article>;
        })}
      </div>
      {MANAGEABLE_PAGES.every(page => !((c as typeof c & { disabledPages?: string[] }).disabledPages ?? []).includes(page.path)) && <p>Aucune page désactivée. Désactive d’abord une page dans « Gérer les pages ».</p>}
    </div></div>}
    {isAdmin && on && showPageManager && <div className="editor-backdrop" onClick={() => setShowPageManager(false)}><div className="editor-dialog editor-pages-dialog" onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="editor-close" aria-label="Fermer" onClick={() => setShowPageManager(false)}><X size={16} /></Button>
      <h3>Gérer les pages du site</h3>
      <p>Visualise chaque page ci-dessous. Désactive-la pour la retirer du site ; tu pourras la réactiver ici.</p>
      <div className="editor-page-grid">
        {MANAGEABLE_PAGES.map(page => {
          const disabledPages = ((c as typeof c & { disabledPages?: string[] }).disabledPages ?? []);
          const permanentlyDeletedPages = ((c as typeof c & { permanentlyDeletedPages?: string[] }).permanentlyDeletedPages ?? []);
          const isPermanentlyDeleted = permanentlyDeletedPages.includes(page.path);
          const isDisabled = disabledPages.includes(page.path) || isPermanentlyDeleted;
          return <article className="editor-page-card" key={page.path}>
            <div className="editor-page-preview"><iframe loading="lazy" title="Aperçu de page" src={page.path + "?tclean-preview=1"} tabIndex={-1} aria-hidden="true" /><span className={isPermanentlyDeleted ? "editor-page-status is-deleted" : isDisabled ? "editor-page-status is-disabled" : "editor-page-status is-active"}>{isPermanentlyDeleted ? "Supprimée" : isDisabled ? "Désactivée" : "Active"}</span></div>
            <div className="editor-page-actions">
              {isPermanentlyDeleted ? <span className="editor-page-done">Suppression effectuée</span> : <button type="button" className="editor-page-action" aria-label={isDisabled ? "Réactiver cette page" : "Désactiver cette page"} title={isDisabled ? "Réactiver" : "Désactiver"} disabled={busy} onClick={() => {
                if (!isDisabled && !window.confirm("Désactiver cette page ? Elle ne sera plus accessible aux visiteurs, mais tu pourras la réactiver ici.")) return;
                void run(() => changePageEnabled({ data: { path: page.path, enabled: isDisabled } }));
              }}>{isDisabled ? <RotateCcw size={17} /> : <Trash2 size={17} />}</button>}
            </div>
          </article>;
        })}
      </div>
    </div></div>}
    {isAdmin && on && showHistory && <div className="editor-backdrop" onClick={() => setShowHistory(false)}><div className="editor-dialog" onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="editor-close" aria-label="Fermer" onClick={() => setShowHistory(false)}><X size={16} /></Button>
      <h3>Historique des modifications</h3>
      <label htmlFor="editor-history-category">Catégorie</label><select id="editor-history-category" value={historyCategory} onChange={e => setHistoryCategory(e.target.value)}>{['Tout', 'Textes', 'Couleurs', 'Suppressions', 'Photos', 'Redirections', 'Écriture', 'Autres'].map(category => <option key={category}>{category}</option>)}</select>
      <p>Les 100 dernières modifications sont conservées. Revenir avant une modification annule aussi les suivantes et les retire de cet historique, sans ajouter de nouvelle ligne ; les commandes et tarifs ne changent pas.</p>
      {historyCount === 0 && <p>Aucune modification enregistrée.</p>}
      <ul className="editor-history">
        {[...editHistory].reverse().filter(entry => historyCategory === 'Tout' || categoryOf(entry.label) === historyCategory).map(entry => <li key={entry.id}><span><strong>{entry.label}</strong><small>{categoryOf(entry.label)} · {new Date(entry.at).toLocaleString('fr-FR')}</small></span><Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm('Revenir avant cette modification ? Elle et les suivantes seront annulées et retirées de l’historique. Aucune nouvelle ligne ne sera ajoutée.')) void run(() => restore({ data: entry.id })); }}><RotateCcw size={14} />Revenir avant</Button></li>)}
        {(historyCategory === 'Tout' || historyCategory === 'Suppressions') && Object.entries(allHidden).filter(([k]) => !permanentHidden[k]).sort((a, b) => parseInfo(b[1]).at.localeCompare(parseInfo(a[1]).at)).map(([k, v]) => { const i = parseInfo(v); return <li key={k}><span><strong>{i.label}</strong><small>{AUD_LABEL[(audMap[`hide:${k}`] as Audience) ?? 'all']} · supprimé depuis {i.page || '?'}{i.at ? ` le ${new Date(i.at).toLocaleString('fr-FR')}` : ''}</small></span><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => save({ data: { kind: 'hide', key: k, value: null } }))}><RotateCcw size={14} />Rétablir</Button></div></li>; })}
        {(historyCategory === 'Tout' || historyCategory === 'Suppressions') && legacyHidden.map(([k]) => <li key={k}><span><strong>Élément de page</strong><small>Page {k.split('|')[0]} uniquement</small></span><Button size="sm" variant="outline" disabled={busy} onClick={() => { const cur = { ...(c.elementColors?.[k] ?? {}) }; delete cur.display; void run(() => saveColors({ data: { kind: 'element', key: k, colors: Object.keys(cur).length ? cur : null } })); }}><RotateCcw size={14} />Rétablir</Button></li>)}
      </ul>
    </div></div>}
    {isAdmin && on && pending && <div className="editor-redirect"><span>Bouton « {pending.label} » → page actuelle : <strong>{pathname}</strong></span>
      <Button size="sm" disabled={busy} onClick={() => run(async () => { await save({ data: { kind: 'link', key: pending.key, value: pathname, audience } }); choosePending(null); })}>Rediriger ici</Button>
      {links[pending.key] && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => { await save({ data: { kind: 'link', key: pending.key, value: null } }); choosePending(null); })}>Lien d’origine</Button>}
      <Button size="sm" variant="ghost" onClick={() => choosePending(null)}>Annuler</Button></div>}
    {isAdmin && on && colorTarget && <SiteColorEditor key={typeof colorTarget === 'string' ? colorTarget : colorTarget.key} config={c} pathname={pathname} target={colorTarget} onClose={() => setColorTarget(null)} />}
    {isAdmin && on && target && <div className="editor-backdrop" onClick={() => setTarget(null)}><div className="editor-dialog" onClick={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="editor-close" aria-label="Fermer" onClick={() => setTarget(null)}><X size={16} /></Button>
      {target.kind === 'text' ? <>
        <h3>Modifier ce texte</h3>
        {priceLike && <p className="editor-warn">Ce texte contient un prix ou une distance. Pour changer le vrai calcul des tarifs, utilisez Administration → Prestations & tarifs. Ici, vous ne changez que l’affichage.</p>}
        <textarea aria-label="Texte à modifier" value={draft} onChange={e => { setDraft(e.target.value); setSelection(null); setWriting(v => ({ ...v, ranges: [] })); }} onSelect={e => { const { selectionStart: start, selectionEnd: end } = e.currentTarget; if (end <= start) return; setSelection({ start, end }); const current = writing.ranges?.find(r => r.start <= start && r.end >= end); setRangeWriting(current ? { font: current.font, size: current.size } : { font: writing.font, size: writing.size }); setRangeColor(current?.color ?? null); }} rows={Math.min(10, Math.max(3, Math.ceil(draft.length / 60)))} />
        <div className="editor-actions"><Button size="sm" variant={selection ? 'outline' : 'secondary'} onClick={() => { if (selection) setWriting(previewWriting()); setSelection(null); }}>Texte entier</Button>{selection && <span>Passage sélectionné : « {draft.slice(selection.start, selection.end)} »</span>}</div>
        <div className="editor-typography-controls">
          <div className="field"><label htmlFor="editor-font">Police d’écriture</label><select id="editor-font" value={(selection ? rangeWriting : writing).font} disabled={busy} onChange={e => (selection ? setRangeWriting : setWriting)(v => ({ ...v, font: e.target.value as Typography['font'] }))}>{fontOptions.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}</select></div>
          <div><label htmlFor="editor-font-size">Taille (px)</label><Input id="editor-font-size" type="number" min={8} max={120} step={1} placeholder="Taille d’origine" disabled={busy} value={(selection ? rangeWriting : writing).size ?? ''} onChange={e => (selection ? setRangeWriting : setWriting)(v => ({ ...v, size: e.target.value === '' ? null : Math.min(120, Math.max(8, Math.round(Number(e.target.value)))) }))} /></div>
          {selection && <div><label htmlFor="editor-range-color">Couleur du passage</label><Input id="editor-range-color" type="color" value={rangeColor ?? '#000000'} onChange={e => setRangeColor(e.target.value)} /><Button size="sm" variant="outline" onClick={() => setRangeColor(null)}><RotateCcw size={14} />Couleur d’origine</Button></div>}
        </div>
        <div className="editor-actions">
          <Button variant="outline" disabled={busy} onClick={() => { if (selection) { setRangeWriting({ font: 'site', size: null }); setRangeColor(null); } else setWriting({ font: 'site', size: null }); }}><RotateCcw size={14} />Écriture d’origine</Button>
          {content[target.key] !== undefined && <Button variant="outline" disabled={busy} onClick={() => run(() => save({ data: { kind: 'text', key: target.key, value: null } }))}>Revenir au texte d’origine</Button>}
          <Button disabled={busy || !draft.trim()} onClick={() => run(async () => { const value = previewWriting(); if (draft !== (content[target.key] ?? target.key)) await save({ data: { kind: 'text', key: target.key, value: draft, audience } }); await save({ data: { kind: 'typography', key: target.key, value: value.font === 'site' && value.size === null && !value.ranges?.length ? null : JSON.stringify(value), audience } }); })}>Enregistrer</Button>
        </div>
      </> : <>
        <h3>Changer cette photo</h3><p>JPEG, PNG ou WebP, 5 Mo maximum.</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" />
        <div className="editor-actions">
          {images[target.key] && <Button variant="outline" disabled={busy} onClick={() => run(() => save({ data: { kind: 'image', key: target.key, value: null } }))}>Revenir à la photo d’origine</Button>}
          <Button disabled={busy} onClick={() => { const f = fileRef.current?.files?.[0]; if (!f) { toast.error('Choisissez une photo.'); return; } if (f.size > 5 * 1024 * 1024) { toast.error('La photo doit peser moins de 5 Mo.'); return; }
            run(async () => { const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(f); });
              const { url } = await upload({ data: { type: f.type as 'image/jpeg', base64 } }); await save({ data: { kind: 'image', key: target.key, value: url, audience } }); }); }}>Enregistrer</Button>
        </div>
      </>}
    </div></div>}
  </div>;
}
