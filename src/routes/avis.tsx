import { createFileRoute } from '@tanstack/react-router';
import { ReviewsPage, reviewsQuery } from '@/components/tclean/reviews';
import { businessQuery, pageHead } from '@/lib/business-query';
export const Route = createFileRoute('/avis')({ loader: async ({ context }) => { const [c] = await Promise.all([context.queryClient.ensureQueryData(businessQuery), context.queryClient.ensureQueryData(reviewsQuery)]); return c; }, head: ({ loaderData }) => pageHead(loaderData ?? ({ name: 'TClean' } as import('@/lib/business').BusinessConfig), 'Avis clients TClean Strasbourg', 'Les avis des clients TClean sur leur nettoyage de canapé à domicile, et le formulaire pour donner le vôtre.', '/avis'), component: ReviewsPage });
