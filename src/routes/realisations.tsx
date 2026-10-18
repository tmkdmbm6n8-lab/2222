import { createFileRoute } from '@tanstack/react-router';
import { GalleryPage } from '@/components/tclean/interventions-gallery';
import { businessQuery,pageHead } from '@/lib/business-query';
export const Route=createFileRoute('/realisations')({loader:({context})=>context.queryClient.ensureQueryData(businessQuery),head:({loaderData})=>pageHead(loaderData??{name:'TClean'} as import('@/lib/business').BusinessConfig,'Réalisations TClean','Découvrez les interventions TClean à domicile en vidéo, avec trois photos avant et trois photos après nettoyage.','/realisations'),component:GalleryPage});
