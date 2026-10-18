import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteDiscount, deleteReview, getReviews, listDiscounts, saveDiscount } from '@/lib/business.functions';

export function AdminDiscounts() {
  const list = useServerFn(listDiscounts); const save = useServerFn(saveDiscount); const del = useServerFn(deleteDiscount);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDiscounts>>>([]); const [code, setCode] = useState(''); const [percent, setPercent] = useState('10');
  const refresh = () => list().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); } };
  return <div className="grid gap-4">
    <p className="text-sm">Créez autant de codes que vous voulez. Le client saisit le code au moment où son prix s’affiche ; la réduction s’ajoute aux 5 % du compte client.</p>
    <form className="inline-actions" onSubmit={e => { e.preventDefault(); act(() => save({ data: { code, percent: Number(percent), active: true } }), 'Code créé.').then(() => setCode('')); }}>
      <div className="field"><label htmlFor="dc-code">Code (lettres, chiffres, - ou _)</label><input id="dc-code" required value={code} maxLength={40} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="BIENVENUE10" /></div>
      <div className="field"><label htmlFor="dc-pct">Réduction (%)</label><input id="dc-pct" type="number" min={1} max={100} step="0.5" required value={percent} onChange={e => setPercent(e.target.value)} /></div>
      <Button type="submit"><Plus />Créer le code</Button>
    </form>
    {rows.length === 0 ? <p className="notice">Aucun code pour le moment.</p> : rows.map(r => <div key={r.code} className="admin-item inline-actions justify-between"><span><strong>{r.code}</strong> · -{Number(r.percent)} % · {r.active ? 'actif' : 'désactivé'}</span><span className="inline-actions">
      <Button size="sm" variant="outline" onClick={() => act(() => save({ data: { code: r.code, percent: Number(r.percent), active: !r.active } }), r.active ? 'Code désactivé.' : 'Code activé.')}>{r.active ? 'Désactiver' : 'Activer'}</Button>
      <Button size="sm" variant="outline" aria-label={`Supprimer ${r.code}`} onClick={() => act(() => del({ data: r.code }), 'Code supprimé.')}><Trash2 /></Button></span></div>)}
  </div>;
}

export function AdminReviews() {
  const load = useServerFn(getReviews); const del = useServerFn(deleteReview); const qc = useQueryClient();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getReviews>>>([]);
  const refresh = () => load().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="grid gap-4"><p className="text-sm">Les avis sont publiés immédiatement. Vous pouvez supprimer un avis inapproprié.</p>
    {rows.length === 0 ? <p className="notice">Aucun avis pour le moment.</p> : rows.map(r => <div key={r.id} className="admin-item inline-actions justify-between"><span><strong>{r.author}</strong> · {r.rating}/5 · {new Date(r.created_at).toLocaleDateString('fr-FR')}{r.comment && <><br />{r.comment}</>}{r.photo && <><br /><img src={r.photo} alt="" width={120} /></>}</span>
      <Button size="sm" variant="outline" onClick={async () => { if (!confirm('Supprimer cet avis ?')) return; try { await del({ data: r.id }); toast.success('Avis supprimé.'); refresh(); qc.invalidateQueries({ queryKey: ['reviews'] }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); } }}><Trash2 />Supprimer</Button></div>)}
  </div>;
}
