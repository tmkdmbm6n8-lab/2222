import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/contact')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Contact TClean Strasbourg','Contactez TClean au 06 77 69 50 79 pour votre nettoyage de canapé à domicile, Strasbourg et 50 km autour.','/contact'),component:ContactPage});
