import { createFileRoute } from '@tanstack/react-router';
import { BookingPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/reservation')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Réservation de nettoyage à Strasbourg','Demandez un créneau de nettoyage à domicile. Rendez-vous confirmé uniquement après validation par TClean.','/reservation'),component:BookingPage});
