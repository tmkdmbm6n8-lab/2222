import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/cookies')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Politique cookies TClean','Informations légales et conditions du site TClean.','/cookies',false),component:Page});
function Page(){return <LegalPage type="cookies"/>}
