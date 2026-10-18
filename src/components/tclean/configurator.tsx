import { useEffect, useState, type FormEvent } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessQuery } from '@/lib/business-query';
import { telephone } from '@/lib/business';
import { checkDiscount, getClientData, getSlots, profileComplete, submitRequest } from '@/lib/business.functions';
import { ACCOUNT_DISCOUNT, PROFILE_DISCOUNT, applyDiscount, totalPercent } from '@/lib/discounts';
import { supabase } from '@/integrations/supabase/client';
import { paymentsConfigured } from '@/lib/stripe';
import { RequestCheckout } from './checkout';
import { armLabels, availableTypes, colors, defaultConfiguration, fabrics, forType, priceConfiguration, soilLabels, summarize, typeInfo, type Configuration } from '@/lib/configurator';
import { FurniturePhoto } from './furniture-photo';
import { BookingCalendar } from './booking-calendar';

const steps = ['Mobilier', 'Forme', 'Tissu', 'Couleur', 'Avant / après', 'État', 'Estimation', 'Réservation'];

function Compare({ cfg }: { cfg: Configuration }) {
  const [pos, setPos] = useState(50);
  return <div className="cfg-compare">
    <FurniturePhoto cfg={cfg} dirty className="cfg-svg" />
    <div className="cfg-compare-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}><FurniturePhoto cfg={cfg} className="cfg-svg" label="Après nettoyage, illustration indicative" /></div>
    <span className="cfg-tag left">Avant nettoyage</span><span className="cfg-tag right">Après nettoyage — illustration indicative</span>
    <span className="cfg-handle" style={{ left: `${pos}%` }} aria-hidden="true" />
    <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))} aria-label="Comparer avant et après nettoyage" className="cfg-range" />
  </div>;
}

export function Configurator() {
  const { data: c } = useSuspenseQuery(businessQuery); const submit = useServerFn(submitRequest); const loadSlots = useServerFn(getSlots);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getSlots>>>([]); const [slotsLoading, setSlotsLoading] = useState(true); const [slotId, setSlotId] = useState(''); const [address, setAddress] = useState('');
  const types = availableTypes(c);
  const { mobilier } = useSearch({ from: '/configurateur' });
  useEffect(() => { const chosen = types.find(t => t.id === mobilier); if (chosen) { setCfg(forType(defaultConfiguration, chosen.id)); setStep(0); } }, [mobilier]);
  const [cfg, setCfg] = useState<Configuration>(() => types.some(t => t.id === 'sofa3') || !types[0] ? defaultConfiguration : forType(defaultConfiguration, types[0].id));
  const [step, setStep] = useState(0); const [form, setForm] = useState({ customer_name: '', phone: '', email: '', postal_code: '', city: '', message: '', honeypot: '' });
  const [files, setFiles] = useState<File[]>([]); const [consent, setConsent] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; const refresh = () => loadSlots().then(rows => { if (active) { setSlots(rows); setSlotId(current => rows.some(s => s.id === current && s.available) ? current : ''); } }).catch(() => { if (active) setError('Les disponibilités n’ont pas pu être chargées.'); }).finally(() => { if (active) setSlotsLoading(false); }); refresh(); const timer = setInterval(refresh, 15000); return () => { active = false; clearInterval(timer); }; }, [loadSlots]); const [busy, setBusy] = useState(false); const [id, setId] = useState('');
  const [signedIn, setSignedIn] = useState(false); const [codeInput, setCodeInput] = useState(''); const [code, setCode] = useState<{ code: string; percent: number } | null>(null); const [codeMsg, setCodeMsg] = useState(''); const [payment, setPayment] = useState<'onsite' | 'online'>('onsite'); const [payId, setPayId] = useState(''); const check = useServerFn(checkDiscount);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s)); return () => data.subscription.unsubscribe(); }, []);
  const [profileDone, setProfileDone] = useState(false); const loadClient = useServerFn(getClientData);
  useEffect(() => { if (signedIn) loadClient().then(d => { const p = d.profile; setProfileDone(profileComplete(p)); if (p) { setForm(f => ({ ...f, customer_name: f.customer_name || p.full_name, phone: f.phone || p.phone, postal_code: f.postal_code || p.postal_code, city: f.city || p.city })); setAddress(a => a || p.address); } supabase.auth.getUser().then(({ data: u }) => { const mail = u.user?.email; if (mail) setForm(f => ({ ...f, email: f.email || mail })); }); }).catch(() => {}); else setProfileDone(false); }, [signedIn, loadClient]);
  const set = <K extends keyof Configuration>(k: K, v: Configuration[K]) => setCfg(p => ({ ...p, [k]: v }));
  const info = typeInfo(cfg.type); const sofa = info.family === 'sofa'; const price = priceConfiguration(c, cfg); const percent = totalPercent(signedIn, code?.percent ?? 0, profileDone); const finalTotal = applyDiscount(price.total, percent);
  const num = (k: 'seatCushions' | 'backCushions' | 'extraArmchairs' | 'extraChairs' | 'width', label: string, min: number, max: number) => <div className="field"><label htmlFor={`cfg-${k}`}>{label}</label><input id={`cfg-${k}`} type="number" min={min} max={max} value={cfg[k]} onChange={e => set(k, Math.min(max, Math.max(min, Number(e.target.value) || 0)))} /></div>;
  const toggle = (k: 'decorative' | 'pouf' | 'stains' | 'odors' | 'pets' | 'removable', label: string) => <label className="choice-label"><input type="checkbox" checked={cfg[k]} onChange={e => set(k, e.target.checked)} />{label}</label>;
  const priceText = finalTotal === null ? 'Tarif communiqué par TClean au rendez-vous' : `${finalTotal.toLocaleString('fr-FR')} € TTC — Prix final TTC`;
  const applyCode = async () => { setCodeMsg(''); if (!codeInput.trim()) { setCode(null); return; } try { const r = await check({ data: codeInput }); if (r.valid) { setCode({ code: r.code, percent: r.percent }); setCodeMsg(`Code ${r.code} appliqué : -${r.percent} %`); } else { setCode(null); setCodeMsg('Ce code n’est pas valide.'); } } catch { setCodeMsg('Vérification impossible, réessayez.'); } };
  const discountBox = <div className="field"><label htmlFor="cfg-code">Code de réduction</label><div className="inline-actions"><input id="cfg-code" value={codeInput} maxLength={40} onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } }} placeholder="Votre code" /><Button type="button" variant="outline" onClick={applyCode}>Appliquer</Button></div>{codeMsg && <small role="status">{codeMsg}</small>}{!signedIn && <small><Link to="/compte" className="underline">Créez votre compte client</Link> pour bénéficier de {ACCOUNT_DISCOUNT} % de réduction.</small>}</div>;
  const colorLabel = cfg.color === 'autre' ? cfg.otherColor || 'Autre couleur' : colors.find(x => x.id === cfg.color)?.label;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^\d{5}$/.test(form.postal_code)) return setError('Le code postal doit contenir 5 chiffres.');
    if (!slotId) return setError('Choisissez une date dans le calendrier.');
    if (!address.trim()) return setError('Indiquez votre adresse.');
    if (!consent) return setError('Votre accord est nécessaire pour traiter cette demande.');
    setBusy(true);
    try {
      const photos = await Promise.all(files.map(file => new Promise<{ name: string; type: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string }>((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: file.name, type: file.type as 'image/jpeg', base64: String(r.result).split(',')[1] ?? '' }); r.onerror = rej; r.readAsDataURL(file); })));
      const result = await submit({ data: { kind: 'booking', customer_name: form.customer_name, phone: form.phone, email: form.email, postal_code: form.postal_code, city: form.city, address, slot_id: slotId, photos, honeypot: form.honeypot, discount_code: code?.code ?? '', payment_method: payment, details: { service: info.service, quantity: 1, size: cfg.width ? `${cfg.width} cm` : '', condition: summarize(cfg), date: '', message: form.message, configurator: cfg } } });
      setId(result.id); if (payment === 'online') setPayId(result.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'L’envoi a échoué. Réessayez ou appelez TClean.'); loadSlots().then(setSlots).catch(() => {}); } finally { setBusy(false); }
  };

  if (!types.length) return <div className="notice">Le configurateur sera disponible dès que TClean aura activé ses prestations. <a href={`tel:${telephone(c)}`}>Appelez le {c.phone}</a>.</div>;
  if (id && payId) return <div className="form-panel"><h2>Réglez votre réservation</h2><p>Votre date est bloquée. Montant : <strong>{priceText}</strong></p><RequestCheckout requestId={payId} /></div>;
  if (id) return <div className="form-panel success-panel"><CheckCircle2 size={48} /><h2>Votre rendez-vous est confirmé.</h2><p>Votre date est bloquée. Retrouvez la confirmation et échangez avec TClean depuis la page Contact (compte client requis). Aucun e-mail ni SMS n’est envoyé.</p><p>Référence : {id.slice(0, 8).toUpperCase()}</p><Button asChild variant="outline"><a href={`tel:${telephone(c)}`}><Phone />Appeler {c.name}</a></Button></div>;

  return <div className="cfg">
    <ol className="cfg-progress" aria-label="Étapes du configurateur">{steps.map((s, i) => <li key={s}><Button variant="ghost" type="button" className={i === step ? 'current' : i < step ? 'done' : ''} onClick={() => i <= step && setStep(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span>{s}</Button></li>)}</ol>
    <div className="cfg-layout">
      <div className="cfg-preview" aria-live="polite">
        {step === 4 ? <Compare cfg={cfg} /> : <FurniturePhoto cfg={cfg} dirty={step >= 5} className="cfg-svg" />}
        {step >= 5 && <div className="cfg-state-caption"><strong>{soilLabels[cfg.soil]}</strong>{cfg.stains && <span>Taches visibles</span>}{cfg.odors && <span>Odeurs signalées</span>}{cfg.pets && <span>Poils d’animaux</span>}{(sofa || info.family === 'armchair') && cfg.removable && <span>Coussin amovible</span>}</div>}
        <p className="cfg-caption">{info.label} · {fabrics.find(f => f.id === cfg.fabric)?.label} · {colorLabel}</p>
        <small className="text-muted-foreground">Illustration photographique générée, non contractuelle — pas une photo d’intervention TClean. Les odeurs sont représentées par un symbole.</small>
      </div>
      <form className="cfg-panel" onSubmit={step === 7 ? onSubmit : e => { e.preventDefault(); setStep(step + 1); }}>
        <h2>{['Quel mobilier souhaitez-vous faire nettoyer ?', 'Sa forme et ses options', 'Le tissu de votre mobilier', 'Choisissez la couleur', 'Visualisez la différence', 'L’état de votre mobilier', 'Votre estimation', 'Choisissez votre date'][step]}</h2>
        {step === 0 && <div className="cfg-cards" role="radiogroup" aria-label="Type de mobilier">{types.map(t => <Button variant="ghost" type="button" role="radio" aria-checked={cfg.type === t.id} key={t.id} className="cfg-card" onClick={() => setCfg(p => forType(p, t.id))}><FurniturePhoto compact cfg={forType({ ...cfg, color: cfg.color }, t.id)} className="cfg-thumb" label={t.label} /><span>{t.label}</span></Button>)}</div>}
        {step === 1 && <>{(sofa || info.family === 'armchair') && <div className="field"><label htmlFor="cfg-arms">Accoudoirs</label><select id="cfg-arms" value={cfg.arms} onChange={e => set('arms', e.target.value as Configuration['arms'])}>{Object.entries(armLabels).filter(([k]) => sofa || k !== 'none').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>}
          {sofa && <div className="field-grid">{num('seatCushions', 'Places / coussins d’assise', 1, 8)}{num('backCushions', 'Coussins de dossier', 0, 8)}</div>}
          {sofa && <div className="choice-grid">{toggle('decorative', 'Coussins décoratifs')}{toggle('pouf', 'Pouf assorti')}</div>}
          {cfg.type === 'cushion' && <div className="field-grid">{num('seatCushions', 'Nombre de coussins', 1, 8)}</div>}
          {info.family === 'mattress' && <div className="field"><label htmlFor="cfg-faces">Faces à nettoyer</label><select id="cfg-faces" value={cfg.faces} onChange={e => set('faces', e.target.value as Configuration['faces'])}><option value="one">Une face</option><option value="two">Les deux faces</option></select></div>}
          <div className="field-grid">{c.services.some(s => s.slug === 'fauteuil' && s.enabled) && num('extraArmchairs', 'Fauteuils supplémentaires', 0, 10)}{c.services.some(s => s.slug === 'chaises' && s.enabled) && num('extraChairs', 'Chaises supplémentaires', 0, 12)}</div>
          {num('width', 'Largeur approximative en cm (facultatif, 0 si inconnue)', 0, 600)}</>}
        {step === 2 && <><div className="cfg-cards" role="radiogroup" aria-label="Tissu">{fabrics.map(f => <button type="button" role="radio" aria-checked={cfg.fabric === f.id} key={f.id} className="cfg-card fabric" onClick={() => set('fabric', f.id)}><span className={`cfg-swatch tex-${f.id}`} /><span><strong>{f.label}</strong><small>{f.description}</small></span></button>)}</div>
          {fabrics.find(f => f.id === cfg.fabric)?.check && <div className="notice">Ce textile demande une vérification avant intervention : TClean confirmera la méthode adaptée après examen.{cfg.fabric === 'inconnu' && ' Vous pourrez ajouter une photo à la dernière étape.'}</div>}</>}
        {step === 3 && <><div className="cfg-colors" role="radiogroup" aria-label="Couleur">{colors.map(col => <button type="button" role="radio" aria-checked={cfg.color === col.id} aria-label={col.label} title={col.label} key={col.id} className="cfg-color" style={{ background: col.hex }} onClick={() => set('color', col.id)} onFocus={() => set('color', col.id)} />)}</div><p className="cfg-caption">{colorLabel}</p>
          {cfg.color === 'autre' && <div className="field"><label htmlFor="cfg-oc">Précisez la couleur</label><input id="cfg-oc" value={cfg.otherColor} maxLength={80} onChange={e => set('otherColor', e.target.value)} /></div>}</>}
        {step === 4 && <p>Faites glisser le curseur sur l’illustration pour comparer. Le résultat réel dépend du textile, de l’ancienneté et de la nature des taches : certaines peuvent ne pas disparaître entièrement.</p>}
        {step === 5 && <><div className="field"><label htmlFor="cfg-soil">État général</label><select id="cfg-soil" value={cfg.soil} onChange={e => set('soil', e.target.value as Configuration['soil'])}>{Object.entries(soilLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div><div className="choice-grid">{toggle('stains', 'Taches visibles')}{toggle('odors', 'Odeurs')}{toggle('pets', 'Poils d’animaux')}{toggle('removable', 'Coussins amovibles')}</div></>}
        {step === 6 && <><dl className="recap">{price.lines.map(l => <div key={l.label}><dt>{l.label}{l.label.startsWith('Chaises') ? '' : ` × ${l.quantity}`}</dt><dd>{l.unit === null ? 'Sur devis' : `${l.from ? 'À partir de ' : ''}${(l.unit * (l.label.startsWith('Chaises') ? 1 : l.quantity)).toLocaleString('fr-FR')} € TTC`}</dd></div>)}{price.travelFee !== null && price.travelFee > 0 ? <div><dt>Déplacement</dt><dd>{price.travelFee} € TTC</dd></div> : null}<div><dt>Temps de séchage</dt><dd>Entre 12 et 24 h</dd></div>{signedIn && <div><dt>Réduction compte client</dt><dd>-{ACCOUNT_DISCOUNT} %</dd></div>}{profileDone && <div><dt>Profil complet</dt><dd>-{PROFILE_DISCOUNT} %</dd></div>}{code && <div><dt>Code {code.code}</dt><dd>-{code.percent} %</dd></div>}<div><dt>Prix final TTC</dt><dd><strong>{finalTotal === null ? 'Tarif communiqué par TClean au rendez-vous' : `${finalTotal.toLocaleString('fr-FR')} € TTC`}</strong></dd></div></dl>{discountBox}{price.needsCheck && <div className="notice">Montant à confirmer après vérification de l’état réel et du textile.</div>}</>}
        {step === 7 && <><div className="cfg-summary"><FurniturePhoto cfg={cfg} dirty className="cfg-mini" /><p>{summarize(cfg)}{cfg.width ? ` · ${cfg.width} cm` : ''}<br /><strong>{priceText}</strong></p></div>
          <div className="sr-honeypot" aria-hidden="true"><label>Site internet<input tabIndex={-1} value={form.honeypot} onChange={e => setForm({ ...form, honeypot: e.target.value })} autoComplete="off" /></label></div>
          <div className="field"><label>Date et heure *</label>{slotsLoading ? <p>Chargement des disponibilités…</p> : slots.length ? <BookingCalendar slots={slots} value={slotId} onChange={setSlotId} /> : <div className="notice">Aucune date disponible pour le moment. Appelez le {c.phone}.</div>}</div>
          <div className="field-grid">{([['customer_name', 'Prénom et nom', 'name', 'text'], ['phone', 'Téléphone', 'tel', 'tel'], ['email', 'Adresse e-mail', 'email', 'email'], ['postal_code', 'Code postal', 'postal-code', 'text'], ['city', 'Ville', 'address-level2', 'text']] as const).map(([k, l, ac, ty]) => <div className="field" key={k}><label htmlFor={`cf-${k}`}>{l} *</label><input id={`cf-${k}`} type={ty} required autoComplete={ac} inputMode={k === 'postal_code' ? 'numeric' : undefined} maxLength={k === 'postal_code' ? 5 : 200} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}</div>
          <div className="field"><label htmlFor="cf-addr">Adresse *</label><input id="cf-addr" required autoComplete="street-address" maxLength={200} value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="field"><label htmlFor="cf-msg">Commentaire (facultatif)</label><textarea id="cf-msg" maxLength={3000} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
          <div className="field"><label htmlFor="cf-photos">Photos réelles du mobilier (facultatives, 4 max., 5 Mo)</label><input id="cf-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const s = Array.from(e.target.files ?? []); if (s.length > 4 || s.some(f => f.size > 5 * 1024 * 1024)) { setError('Ajoutez jusqu’à 4 photos de moins de 5 Mo.'); e.target.value = ''; return; } setError(''); setFiles(s); }} /></div>
          {discountBox}<div className="field"><label>Paiement *</label><div className="choice-grid"><label className="choice-label"><input type="radio" name="pay" checked={payment === 'onsite'} onChange={() => setPayment('onsite')} />Payer sur place, le jour du rendez-vous</label>{paymentsConfigured && finalTotal !== null && <label className="choice-label"><input type="radio" name="pay" checked={payment === 'online'} onChange={() => setPayment('online')} />Payer maintenant par carte bancaire</label>}</div></div>
          <div className="notice">Intervention à {c.city} et dans un rayon maximal de {c.radius} km, sous réserve de validation. Votre date est bloquée pour vous, puis confirmée par TClean.</div>
          <label className="choice-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>J’accepte que mes données soient utilisées pour traiter ma demande. <Link to="/confidentialite" className="underline">Politique de confidentialité</Link></span></label></>}
        {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
        <div className="inline-actions justify-between mt-6">
          {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep(step === 7 ? 0 : step - 1)}><ArrowLeft />{step === 7 ? 'Modifier ma configuration' : 'Retour'}</Button> : <span />}
          {step === 6 ? <Button type="submit"><ArrowRight />Choisir ma date</Button> : step === 7 ? <Button type="submit" disabled={busy}>{busy ? 'Confirmation en cours…' : 'Réserver cette date'}</Button> : <Button type="submit">{step === 5 ? 'Voir mon estimation' : 'Suivant'}<ArrowRight /></Button>}
        </div>
      </form>
    </div>
  </div>;
}
