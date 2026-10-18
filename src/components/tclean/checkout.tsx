import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { getStripe, getStripeEnvironment, paymentsTestMode } from '@/lib/stripe';
import { createRequestCheckout } from '@/lib/payments.functions';

export function PaymentTestModeBanner() {
  if (!paymentsTestMode) return null;
  return <div className="notice">Mode test : aucun vrai paiement n’est prélevé. Carte d’essai : 4242 4242 4242 4242.</div>;
}

export function RequestCheckout({ requestId }: { requestId: string }) {
  const fetchClientSecret = useCallback(async () => {
    const r = await createRequestCheckout({ data: { requestId, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/paiement/retour?session_id={CHECKOUT_SESSION_ID}` } });
    if ('error' in r) throw new Error(r.error);
    return r.clientSecret;
  }, [requestId]);
  return <div><PaymentTestModeBanner /><div id="checkout" className="mt-4"><EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider></div></div>;
}
