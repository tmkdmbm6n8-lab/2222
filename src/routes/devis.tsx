import { createFileRoute } from '@tanstack/react-router';
import { QuotePage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/devis')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Devis gratuit de nettoyage à domicile','Décrivez votre mobilier, joignez des photos et demandez votre devis TClean à Strasbourg.','/devis'),component:QuotePage});
