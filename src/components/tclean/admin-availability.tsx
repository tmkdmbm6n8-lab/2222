import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CalendarPlus, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getAdminData, openAvailabilityRange, saveSlot, disableSlot } from '@/lib/business.functions';
import { availabilityRangeSchema, generateAvailability, type AvailabilityRange } from '@/lib/availability-range';
import { parisDay, parisInput, parisInstant } from '@/lib/booking-calendar';

type Props = { slots: Awaited<ReturnType<typeof getAdminData>>['slots']; duration: number; onDurationChange: (value: number) => void; saveDuration: () => Promise<void>; refresh: () => Promise<void> };
const weekdays = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [0, 'Dimanche']] as const;
export function AdminAvailability({ slots, duration, onDurationChange, saveDuration, refresh }: Props) {
  const open = useServerFn(openAvailabilityRange), save = useServerFn(saveSlot), close = useServerFn(disableSlot);
  const [range, setRange] = useState<AvailabilityRange>({ from: '', to: '', opens: '08:00', closes: '19:00', interval: 30, weekdays: [0, 1, 2, 3, 4, 5, 6] });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [filter, setFilter] = useState('');
  let preview: ReturnType<typeof generateAvailability> = [];
  try { if (availabilityRangeSchema.safeParse(range).success) preview = generateAvailability(range, duration); } catch { /* Invalid form values are reported on submission. */ }
  const groups = new Map<string, Props['slots']>();
  for (const slot of slots) { const day = parisDay(slot.starts_at); groups.set(day, [...(groups.get(day) ?? []), slot]); }
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }
  return <div className="space-y-8">
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); setSuccess(''); void mutate(async () => {
      const parsed = availabilityRangeSchema.safeParse(range);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Vérifiez la période.');
      const result = await open({ data: parsed.data });
      const message = result.count ? `${result.count} créneaux ouverts : vos clients peuvent choisir leur date dès maintenant.` : 'Cette période est déjà ouverte : aucun doublon ajouté.';
      setSuccess(message); toast.success(message);
    }); }}>
      <h2>Ouvrir une période</h2>
      <div className="field-grid">
        <div className="field"><label htmlFor="period-from">Du</label><input id="period-from" type="date" required value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></div>
        <div className="field"><label htmlFor="period-to">Au (inclus)</label><input id="period-to" type="date" required min={range.from || undefined} value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></div>
        <div className="field"><label htmlFor="period-opens">Début des interventions</label><input id="period-opens" type="time" required value={range.opens} onChange={e => setRange({ ...range, opens: e.target.value })} /></div>
        <div className="field"><label htmlFor="period-closes">Fin des interventions</label><input id="period-closes" type="time" required value={range.closes} onChange={e => setRange({ ...range, closes: e.target.value })} /></div>
      </div>
      <fieldset><legend className="mb-3 font-medium">Jours ouverts</legend><div className="flex flex-wrap gap-x-5 gap-y-3">{weekdays.map(([id, name]) => <label key={id} className="choice-label"><input type="checkbox" checked={range.weekdays.includes(id)} onChange={e => setRange({ ...range, weekdays: e.target.checked ? [...range.weekdays, id] : range.weekdays.filter(day => day !== id) })} />{name}</label>)}</div></fieldset>
      <div className="field"><label htmlFor="period-interval">Heures de départ proposées</label><select id="period-interval" value={range.interval} onChange={e => setRange({ ...range, interval: Number(e.target.value) === 60 ? 60 : 30 })}><option value={30}>Toutes les 30 minutes</option><option value={60}>Toutes les heures</option></select></div>
      {preview.length > 0 && <p className="text-sm text-muted-foreground">{preview.length} heures de départ · dernier départ à {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(preview.at(-1)?.starts_at ?? ''))} · durée de blocage : {duration} min</p>}
      <Button type="submit" size="lg" disabled={busy}><CalendarPlus />{busy ? 'Ouverture…' : 'Ouvrir toute la période'}</Button>
      {success && <p role="status" className="notice">{success}</p>}
    </form>
    <div className="border-t border-border pt-6"><h3 className="mb-4">Durée d’un rendez-vous</h3><div className="field-grid"><div className="field"><label htmlFor="booking-duration">Blocage par réservation (minutes)</label><input id="booking-duration" type="number" min={30} max={1440} step={30} value={duration} onChange={e => onDurationChange(Number(e.target.value))} /></div><div className="field"><Button disabled={busy} onClick={() => void mutate(saveDuration)}><Save />Enregistrer la durée</Button></div></div><p className="text-sm text-muted-foreground">Une intervention doit se terminer avant l’heure de fermeture. Avec 3 h de blocage et une fin à 19 h, le dernier départ est à 16 h. Les rendez-vous déjà réservés restent bloqués.</p></div>
    <details className="border-t border-border pt-6" open={!!editing}><summary className="cursor-pointer font-medium">Ajouter ou modifier une seule heure</summary><form className="mt-5" onSubmit={e => { e.preventDefault(); void mutate(async () => { await save({ data: { id: editing || undefined, starts_at: parisInstant(start), ends_at: parisInstant(end) } }); setEditing(''); setStart(''); setEnd(''); toast.success('Créneau enregistré.'); }); }}><div className="field-grid"><div className="field"><label htmlFor="single-start">Début (heure de Paris)</label><input id="single-start" type="datetime-local" required value={start} onChange={e => { setStart(e.target.value); if (e.target.value) { try { setEnd(parisInput(new Date(Date.parse(parisInstant(e.target.value)) + duration * 60000))); } catch { setEnd(''); } } }} /></div><div className="field"><label htmlFor="single-end">Fin</label><input id="single-end" type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} /></div></div><Button disabled={busy}><Plus />{editing ? 'Enregistrer ce créneau' : 'Ouvrir ce créneau'}</Button></form></details>
    <div className="border-t border-border pt-6"><h2 className="mb-4">Disponibilités enregistrées</h2><div className="field"><label htmlFor="availability-filter">Afficher une date</label><input id="availability-filter" type="date" value={filter} onChange={e => setFilter(e.target.value)} /></div>{slots.length === 0 && <p>Aucune période ouverte pour le moment.</p>}{[...groups].filter(([day]) => !filter || day === filter).map(([day, daySlots]) => <details key={day} className="border-b border-border py-4"><summary className="cursor-pointer font-medium">{new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR')} · {daySlots.filter(s => s.enabled).length} départs ouverts</summary><div className="admin-list mt-4">{daySlots.map(s => <div key={s.id} className="admin-item inline-actions justify-between"><span>{new Date(s.starts_at).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} — {new Date(s.ends_at).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} · {s.enabled ? 'Ouvert' : 'Fermé'}</span><Button variant="outline" disabled={busy} onClick={() => { setEditing(s.id); setStart(parisInput(s.starts_at)); setEnd(parisInput(s.ends_at)); }}>Modifier</Button>{s.enabled && <Button variant="outline" disabled={busy} onClick={() => void mutate(() => close({ data: s.id }))}>Fermer</Button>}</div>)}</div></details>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}