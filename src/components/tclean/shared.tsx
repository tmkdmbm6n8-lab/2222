import { serviceImage } from '@/lib/service-images';
import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowUpRight, MapPin, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessQuery } from '@/lib/business-query';
import { checkArea, telephone } from '@/lib/business';
import { serviceFurniture } from '@/lib/configurator';
export function PageHeading({title,description,breadcrumb,className,actionLabel,actionTo}:{title:string;description?:ReactNode;breadcrumb?:string;className?:string;actionLabel?:string;actionTo?: "/devis"}){return <section className={`page-heading ${className??""}`}><div className="container-main"><div className="breadcrumbs"><Link to="/">Accueil</Link> / {breadcrumb??title}</div><span className="eyebrow">TClean · À domicile</span><h1>{title}</h1>{description&&<p>{description}</p>}{actionLabel&&actionTo&&<div className="mt-4"><Button asChild variant="outline" size="lg"><Link to={actionTo}>{actionLabel}<ArrowUpRight/></Link></Button></div>}</div></section>}
export function ServicesGrid({limit}:{limit?:number}){const {data:c}=useSuspenseQuery(businessQuery);return <div className="service-grid">{c.services.filter(s=>s.enabled).slice(0,limit).map((s,i)=>{return <Link to="/prestations/$slug" params={{slug:s.slug}} key={s.slug} className="service-card"><div className="service-photo"><img src={serviceImage(s.slug)} alt={`${s.name} — photographie d’illustration`} loading="lazy" width={500} height={300}/><span className="service-number">{String(i+1).padStart(2,'0')} · {s.category}</span></div><div className="service-body"><h3>{s.name}</h3><p>{s.description}</p><div className="service-bottom"><span>{s.price==null?'Sur devis personnalisé':`À partir de ${s.price.toLocaleString('fr-FR')} € TTC`}</span><ArrowUpRight size={17}/></div></div></Link>})}</div>}
export function ZoneChecker(){
  const {data:c}=useSuspenseQuery(businessQuery);
  const [code,setCode]=useState('');
  const [result,setResult]=useState('');
  const success = !!result && result !== 'OUT' && !result.startsWith('Saisissez');
  const invalid = result.startsWith('Saisissez');
  return <div className="zone-check">
    <h3>Et chez vous ?</h3>
    <form className="zone-check-form" onSubmit={e=>{e.preventDefault();if(!/^\d{5}$/.test(code)){setResult('Saisissez un code postal français à 5 chiffres.');return;}const areas=checkArea(c,code);setResult(areas.length?areas.map(a=>a.name).join(', '):'OUT');}}>
      <label className="sr-only" htmlFor="zone-postal">Votre code postal</label>
      <input id="zone-postal" inputMode="numeric" maxLength={5} placeholder="Votre code postal" value={code} onChange={e=>setCode(e.target.value)} required/>
      <Button type="submit" size="lg" variant="secondary">Vérifier<ArrowUpRight/></Button>
    </form>
    {result==='OUT' && <div className="zone-result zone-result-out" role="status" aria-live="polite">
      <div className="zone-result-icon"><AlertCircle size={22}/></div>
      <div className="zone-result-copy"><strong>Vous êtes en dehors de notre zone habituelle</strong><p>Une intervention reste éventuellement possible sur devis personnalisé. Nous étudierons votre adresse avant de vous confirmer.</p>
        <Button asChild size="sm" className="mt-3"><Link to="/devis">Demander un devis<ArrowUpRight/></Link></Button>
      </div>
    </div>}
    {success && <div className="zone-result zone-result-success" role="status" aria-live="polite">
      <div className="zone-result-icon"><CheckCircle2 size={23}/></div>
      <div className="zone-result-copy"><strong>Bonne nouvelle : votre code postal est dans notre zone habituelle.</strong><p>Secteur correspondant : {result}. Nous confirmerons simplement l’adresse exacte et les conditions de déplacement avec vous avant de valider l’intervention.</p></div>
    </div>}
    {invalid && <div className="zone-result zone-result-invalid" role="status" aria-live="polite"><AlertCircle size={19}/><p>{result}</p></div>}
  </div>;
}
export function ZoneBand(){const {data:c}=useSuspenseQuery(businessQuery);return <section className="section zone-band"><div className="container-main zone-layout"><div><span className="eyebrow">Tout près de chez vous</span><h2>À {c.city},<br/>et jusqu’à {c.radius} km autour.</h2><p>Nous nous déplaçons chez vous. Votre adresse et les conditions d’intervention sont vérifiées avant tout rendez-vous.</p><div className="city-list">{c.areas.slice(0,7).map(a=><span key={a.name}>{a.name}</span>)}</div><Button asChild variant="heroOutline" className="mt-7"><Link to="/zone-intervention">Voir notre zone d’intervention<ArrowUpRight/></Link></Button></div><ZoneChecker/></div></section>}
export function FaqList({limit}:{limit?:number}){const {data:c}=useSuspenseQuery(businessQuery);return <div className="faq-list">{c.faqs.slice(0,limit).map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>}
export function ContactActions({service}:{service?:string}){const {data:c}=useSuspenseQuery(businessQuery);return <div className="inline-actions"><Button asChild size="lg">{service ? <Link to="/configurateur" search={{mobilier:serviceFurniture(service)}}>Obtenir mon rendez-vous<ArrowUpRight/></Link> : <Link to="/devis">Obtenir mon devis<ArrowUpRight/></Link>}</Button><Button asChild variant="outline" size="lg"><a href={`tel:${telephone(c)}`}><Phone/>{c.phone}</a></Button></div>}
export function Process(){return <div className="process-grid">{[{title:'Parlons de votre mobilier',text:'Vous nous décrivez vos textiles, leur état et vos besoins.'},{title:'Un devis, en toute clarté',text:'Nous étudions votre demande et précisons les conditions d’intervention.'},{title:'Le soin, chez vous',text:'Le tissu est examiné pour choisir une méthode adaptée avant le nettoyage.'},{title:'Place à la fraîcheur',text:'Vous recevez les consignes d’aération, de séchage et d’entretien.'}].map((p,i)=><div key={p.title}><div className="process-number">0{i+1}</div><h3>{p.title}</h3><p>{p.text}</p></div>)}</div>}
