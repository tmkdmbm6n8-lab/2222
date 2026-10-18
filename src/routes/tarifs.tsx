import { createFileRoute } from '@tanstack/react-router';
import { PricesPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/tarifs')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Tarifs de nettoyage de canapé à Strasbourg','Demandez un devis gratuit TClean. Estimation selon le mobilier et les tarifs publiés, sans frais inventés.','/tarifs'),component:PricesPage});
