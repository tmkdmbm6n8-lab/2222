import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/a-propos')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'À propos de TClean','TClean, entreprise locale de nettoyage de canapés et textiles d’ameublement à domicile à Strasbourg.','/a-propos'),component:AboutPage});
