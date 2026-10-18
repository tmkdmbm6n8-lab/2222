import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessQuery, pageHead } from '@/lib/business-query';

export const Route = createFileRoute('/paiement/retour')({
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined } => ({ session_id: typeof s['session_id'] === 'string' ? s['session_id'] : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(businessQuery),
  head: ({ loaderData }) => pageHead(loaderData ?? ({ name: 'TClean' } as import('@/lib/business').BusinessConfig), 'Paiement de votre réservation', 'Confirmation du paiement en ligne de votre nettoyage TClean.', '/paiement/retour', true),
  component: () => <section className="section container-main"><div className="form-panel success-panel"><CheckCircle2 size={48} /><h2>Merci, votre paiement a été transmis.</h2><p>Votre réservation est enregistrée. TClean confirmera votre rendez-vous.</p><Button asChild><Link to="/">Retour à l’accueil</Link></Button></div></section>,
});
