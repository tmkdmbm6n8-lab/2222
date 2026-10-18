import { useEffect, useRef, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessQuery } from '@/lib/business-query';
import { interventionPhotos } from '@/lib/interventions';
import { PageHeading, ContactActions } from './shared';

function useScrollPlayback(count: number) {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    const videos = refs.current.filter((v): v is HTMLVideoElement => Boolean(v));
    if (!videos.length) return;
    const ratios = new Map<HTMLVideoElement, number>();
    const update = () => {
      let best: HTMLVideoElement | null = null; let bestRatio = 0.35;
      for (const v of videos) { const r = ratios.get(v) ?? 0; if (r > bestRatio) { best = v; bestRatio = r; } }
      for (const v of videos) {
        if (v === best) { if (v.paused) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }
        else if (!v.paused) v.pause();
      }
    };
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) ratios.set(e.target as HTMLVideoElement, e.intersectionRatio);
      update();
    }, { threshold: [0, 0.25, 0.35, 0.5, 0.75, 1] });
    videos.forEach(v => observer.observe(v));
    return () => observer.disconnect();
  }, [count]);
  return refs;
}

export function GalleryPage() {
  const { data: config } = useSuspenseQuery(businessQuery);
  const [selected, setSelected] = useState<{ url: string; title: string } | null>(null);
  const videoRefs = useScrollPlayback(config.gallery.length);
  useEffect(() => {
    if (!selected) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [selected]);
  return <>
    <PageHeading title="Réalisations TClean" description="Nos interventions à domicile, en vidéo et en photos avant / après." />
    <section className="section container-main">
      {!config.gallery.length ? <div className="prose-content"><h2>Les prochaines interventions arrivent ici.</h2><p>Aucune intervention n’a encore été publiée.</p><ContactActions /></div> : <div className="space-y-16">{config.gallery.map((g, index) => {
        const photos = [...interventionPhotos(g, 'before').map((url, i) => ({ url, label: `Avant ${i + 1}` })), ...interventionPhotos(g, 'after').map((url, i) => ({ url, label: `Après ${i + 1}` }))];
        return <article key={`${g.url}:${index}`} className="border-b border-border pb-12">
          <div className="mb-6 text-center max-w-3xl mx-auto"><span className="eyebrow">{g.category || 'Intervention'}</span><h2 className="break-words">{g.title}</h2>{g.date && <time className="block mt-2 text-sm text-muted-foreground" dateTime={g.date}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(`${g.date}T12:00:00Z`))}</time>}{g.description && <p className="mt-4 text-muted-foreground whitespace-pre-line break-words">{g.description}</p>}</div>
          {g.videoUrl && <div className="flex justify-center mb-8"><video ref={el => { videoRefs.current[index] = el; }} className="w-full max-w-4xl max-h-[560px] aspect-video object-contain bg-muted rounded" src={g.videoUrl} poster={g.url} controls muted playsInline preload="metadata" aria-label={`Vidéo — ${g.title}`} /></div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">{photos.map((p, i) => <Button key={`${p.url}:${i}`} variant="ghost" className="group relative block h-auto w-full p-0 overflow-visible rounded aspect-[4/3] hover:z-10" aria-label={`Agrandir ${p.label} — ${g.title}`} onClick={() => setSelected({ url: p.url, title: `${p.label} — ${g.title}` })}>
            <img src={p.url} alt={`${p.label} — ${g.title}`} loading="lazy" className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-125 group-hover:shadow-xl" />
            <span className="absolute top-2 left-2 bg-background text-foreground text-xs font-semibold rounded px-2 py-0.5">{p.label}</span>
            <Maximize2 className="absolute bottom-2 right-2 bg-background text-foreground rounded p-1" />
          </Button>)}</div>
        </article>;
      })}</div>}
    </section>
    {selected && <div className="gallery-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelected(null)}><Button autoFocus className="close" variant="secondary" size="icon" aria-label="Fermer la photographie" onClick={() => setSelected(null)}><X /></Button><img src={selected.url} alt={selected.title} /></div>}
  </>;
}
