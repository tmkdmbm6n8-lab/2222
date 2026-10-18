import { createFileRoute } from '@tanstack/react-router';
import { ZonePage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/zone-intervention')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Nettoyage de canapé à Strasbourg et dans un rayon de 50 km','Vérifiez votre code postal. TClean intervient à Strasbourg et dans un rayon maximal de 50 km, après validation de votre adresse.','/zone-intervention'),component:ZonePage});
