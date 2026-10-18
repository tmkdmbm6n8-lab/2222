import { createFileRoute } from '@tanstack/react-router';
import { PrestationsPage } from '@/components/tclean/public-pages';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/prestations/')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Nos prestations de nettoyage à Strasbourg','TClean nettoie vos canapés, fauteuils, matelas et chaises à domicile à Strasbourg.','/prestations'),component:PrestationsPage});
