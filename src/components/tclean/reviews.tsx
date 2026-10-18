import { useState } from 'react';
import { useQueryClient, useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReviews, submitReview } from '@/lib/business.functions';
import { PageHeading } from './shared';

export const reviewsQuery = queryOptions({ queryKey: ['reviews'], queryFn: () => getReviews(), staleTime: 30000 });
const Stars = ({ n }: { n: number }) => <span className="review-stars" aria-label={`${n} sur 5`}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill={i <= n ? 'currentColor' : 'none'} />)}</span>;

export function ReviewsPage() {
  const { data: reviews } = useSuspenseQuery(reviewsQuery); const qc = useQueryClient(); const send = useServerFn(submitReview);
  const [rating, setRating] = useState(5); const [author, setAuthor] = useState(''); const [comment, setComment] = useState(''); const [file, setFile] = useState<File | null>(null); const [hp, setHp] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [key, setKey] = useState(0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(''); setBusy(true);
    try {
      const photo = file ? await new Promise<{ type: 'image/jpeg'; base64: string }>((res, rej) => { const r = new FileReader(); r.onload = () => res({ type: file.type as 'image/jpeg', base64: String(r.result).split(',')[1] ?? '' }); r.onerror = rej; r.readAsDataURL(file); }) : null;
      await send({ data: { author, rating, comment, photo, honeypot: hp } });
      setAuthor(''); setComment(''); setFile(null); setRating(5); setKey(k => k + 1); setMsg('Merci ! Votre avis est publié.'); await qc.invalidateQueries({ queryKey: ['reviews'] });
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Envoi impossible.'); } finally { setBusy(false); }
  };
  return <><PageHeading title="Avis clients" description="Votre satisfaction compte : notez votre nettoyage, ajoutez un commentaire ou une photo si vous le souhaitez." />
    <section className="section container-main review-layout">
      <form className="form-panel" onSubmit={submit}><h2>Donner mon avis</h2>
        <div className="field"><label>Votre note *</label><div className="review-rate" role="radiogroup" aria-label="Note">{[1, 2, 3, 4, 5].map(i => <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} sur 5`} onClick={() => setRating(i)}><Star size={28} fill={i <= rating ? 'currentColor' : 'none'} /></button>)}</div></div>
        <div className="field"><label htmlFor="rv-name">Votre prénom *</label><input id="rv-name" required minLength={2} maxLength={80} value={author} onChange={e => setAuthor(e.target.value)} /></div>
        <div className="field"><label htmlFor="rv-comment">Commentaire (facultatif)</label><textarea id="rv-comment" maxLength={1500} value={comment} onChange={e => setComment(e.target.value)} /></div>
        <div className="field"><label htmlFor="rv-photo">Photo du travail réalisé (facultative, 5 Mo max.)</label><input key={key} id="rv-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0] ?? null; if (f && f.size > 5 * 1024 * 1024) { setMsg('La photo doit peser moins de 5 Mo.'); e.target.value = ''; return; } setFile(f); }} /></div>
        <div className="sr-honeypot" aria-hidden="true"><input tabIndex={-1} value={hp} onChange={e => setHp(e.target.value)} autoComplete="off" /></div>
        <Button type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Publier mon avis'}</Button>{msg && <p className="mt-3" role="status">{msg}</p>}
      </form>
      <div className="review-list">{reviews.length === 0 ? <p className="notice">Aucun avis pour le moment. Soyez le premier !</p> : reviews.map(r => <article key={r.id} className="review-card"><Stars n={r.rating} /><strong>{r.author}</strong><small>{new Date(r.created_at).toLocaleDateString('fr-FR')}</small>{r.comment && <p>{r.comment}</p>}{r.photo && <img src={r.photo} alt={`Travail réalisé, photo de ${r.author}`} loading="lazy" />}</article>)}</div>
    </section></>;
}
