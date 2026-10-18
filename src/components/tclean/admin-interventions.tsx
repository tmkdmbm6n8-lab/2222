import { useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { prepareInterventionMedia, publishIntervention } from '@/lib/business.functions';
import { siteMediaSchema, type Intervention } from '@/lib/interventions';

export function AdminInterventions({ gallery, onChange, onPublished }: { gallery: Intervention[]; onChange: (items: Intervention[]) => void; onPublished: () => Promise<unknown> }) {
  const prepare = useServerFn(prepareInterventionMedia);
  const publish = useServerFn(publishIntervention);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [before, setBefore] = useState<(File | null)[]>([null, null, null]);
  const [after, setAfter] = useState<(File | null)[]>([null, null, null]);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const fileInput = (label: string, file: File | null, setFile: (file: File | null) => void, isVideo = false) => <div className="field">
    <label>{label}<input type="file" disabled={busy} accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp'} onChange={e => {
      const selected = e.target.files?.[0] ?? null;
      if (selected && !siteMediaSchema.safeParse({ type: selected.type, size: selected.size }).success) { setError('Photo JPG, PNG ou WebP : 5 Mo maximum. Vidéo MP4, WebM ou MOV : 20 Mo maximum.'); e.target.value = ''; return; }
      setError(''); setFile(selected);
    }} /></label>
    {file && <small className="text-muted-foreground break-all">{file.name}</small>}
  </div>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!video || before.some(f => !f) || after.some(f => !f) || !authorized) { setError('Ajoutez la vidéo et les six photos, puis confirmez l’autorisation.'); return; }
    setBusy(true); setError('');
    try {
      let count = 0;
      async function upload(file: File | null) {
        if (!file) throw new Error('Fichier manquant.');
        setProgress(`Envoi ${++count}/7 : ${file.name}`);
        const media = siteMediaSchema.parse({ type: file.type, size: file.size });
        const signed = await prepare({ data: media });
        const result = await supabase.storage.from('site-images').uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (result.error) throw new Error(`Envoi impossible : ${file.name}. Réessayez.`);
        return signed.url;
      }
      const videoUrl = await upload(video);
      const beforePhotos: string[] = [], afterPhotos: string[] = [];
      for (const file of before) beforePhotos.push(await upload(file));
      for (const file of after) afterPhotos.push(await upload(file));
      const result = await publish({ data: { title: title.trim(), category: 'Interventions', description, ...(date ? { date } : {}), videoUrl, beforePhotos, afterPhotos, beforeUrl: beforePhotos[0] ?? '', url: afterPhotos[0] ?? '' } });
      onChange(result); await onPublished();
      setTitle(''); setDate(''); setDescription(''); setVideo(null); setBefore([null, null, null]); setAfter([null, null, null]); setAuthorized(false); setResetKey(key => key + 1);
      toast.success('Votre intervention est publiée.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Publication impossible.'); }
    finally { setBusy(false); setProgress(''); }
  }
  return <>
    <h2 className="mb-6">Nouvelle intervention</h2>
    <form key={resetKey} onSubmit={submit} className="space-y-5">
      <div className="field-grid">
        <div className="field"><label htmlFor="intervention-title">Titre</label><input id="intervention-title" required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></div>
        <div className="field"><label htmlFor="intervention-date">Date de l’intervention</label><input id="intervention-date" type="date" value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="intervention-description">Description</label><textarea id="intervention-description" maxLength={2000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} /></div>
      {fileInput('Vidéo de l’intervention — 20 Mo maximum', video, setVideo, true)}
      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-3 min-w-0"><legend className="font-semibold mb-3">Avant · 3 photos</legend>{before.map((f, i) => <div key={i}>{fileInput(`Photo avant ${i + 1}`, f, file => setBefore(old => old.map((v, j) => j === i ? file : v)))}</div>)}</fieldset>
        <fieldset className="space-y-3 min-w-0"><legend className="font-semibold mb-3">Après · 3 photos</legend>{after.map((f, i) => <div key={i}>{fileInput(`Photo après ${i + 1}`, f, file => setAfter(old => old.map((v, j) => j === i ? file : v)))}</div>)}</fieldset>
      </div>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={authorized} disabled={busy} onChange={e => setAuthorized(e.target.checked)} />Je dispose de l’autorisation de publier ces images et cette vidéo.</label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {progress && <p role="status" className="text-sm break-all">{progress}</p>}
      <Button type="submit" disabled={busy}><Upload />{busy ? 'Publication en cours…' : 'Publier l’intervention'}</Button>
    </form>
    <h2 className="mt-12 mb-6">Interventions publiées ({gallery.length})</h2>
    {gallery.length === 0 && <p className="text-muted-foreground">Aucune intervention publiée.</p>}
    <div className="divide-y divide-border">{gallery.map((g, i) => <div key={`${g.url}:${i}`} className="flex items-center gap-4 py-4">
      {g.url && <img src={g.url} alt={g.title} className="w-20 h-16 object-cover rounded" />}
      <div className="flex-1 min-w-0"><h3 className="break-words">{g.title || 'Sans titre'}</h3>{g.date && <p className="text-sm text-muted-foreground">{g.date}</p>}</div>
      <Button variant="outline" size="icon" title="Retirer l’intervention" aria-label={`Retirer ${g.title}`} onClick={() => { if (window.confirm('Retirer cette intervention ? Enregistrez ensuite les modifications.')) onChange(gallery.filter((_, j) => i !== j)); }}><Trash2 /></Button>
    </div>)}</div>
  </>;
}