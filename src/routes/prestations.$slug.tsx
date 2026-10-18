import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/prestations/$slug')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({params,loaderData})=>{const c=loaderData;const s=c?.services.find(s=>s.slug===params.slug&&s.enabled);return c?pageHead(c,s?`Nettoyage de ${s.name.toLowerCase()} à ${c.city}`:'Prestation indisponible',s?`${c.name} : ${s.description} Nettoyage à domicile à ${c.city}. Devis : ${c.phone}.`:'Cette prestation est indisponible.',`/prestations/${params.slug}`,!s):{meta:[{title:'TClean — Prestation indisponible'},{name:'robots',content:'noindex'}]};},component:Page});
function Page(){const {slug}=Route.useParams();return <ServicePage slug={slug}/>}
