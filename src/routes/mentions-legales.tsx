import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/mentions-legales')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Mentions légales TClean','Informations légales et conditions du site TClean.','/mentions-legales',true),component:Page});
function Page(){return <LegalPage type="legal"/>}
