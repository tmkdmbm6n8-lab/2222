import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '@/components/tclean/account';
import { businessQuery, pageHead } from '@/lib/business-query';
export const Route = createFileRoute('/compte')({ loader: ({ context }) => context.queryClient.ensureQueryData(businessQuery), head: ({ loaderData }) => pageHead(loaderData ?? ({ name: 'TClean' } as import('@/lib/business').BusinessConfig), 'Mon compte client TClean', 'Créez votre compte client TClean et bénéficiez de 5 % de réduction sur votre nettoyage à domicile.', '/compte'), component: AccountPage });
