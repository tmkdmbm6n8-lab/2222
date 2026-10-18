import { createFileRoute } from '@tanstack/react-router';
import { FaqPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/faq')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Questions sur le nettoyage de canapé à domicile','Préparez votre intervention TClean : tarifs, séchage, tissus délicats, taches et réservation.','/faq'),component:FaqPage});
