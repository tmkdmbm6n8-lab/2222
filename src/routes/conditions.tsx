import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/conditions')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Conditions de réservation TClean','Informations légales et conditions du site TClean.','/conditions',true),component:Page});
function Page(){return <LegalPage type="conditions"/>}
