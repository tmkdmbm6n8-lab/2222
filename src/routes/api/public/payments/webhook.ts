import { createFileRoute } from '@tanstack/react-router';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

async function setStatus(requestId: string | undefined, status: string) {
  if (!requestId || !/^[0-9a-f-]{36}$/.test(requestId)) return;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  await supabaseAdmin.from('quote_requests').update({ payment_status: status }).eq('id', requestId);
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const rawEnv = new URL(request.url).searchParams.get('env');
    if (rawEnv !== 'sandbox' && rawEnv !== 'live') return Response.json({ received: true, ignored: 'invalid env' });
    try {
      const event = await verifyWebhook(request, rawEnv as StripeEnv);
      const obj = event.data.object;
      if (event.type === 'checkout.session.completed') await setStatus(obj.metadata?.requestId, obj.payment_status === 'unpaid' ? 'processing' : 'paid');
      else if (event.type === 'checkout.session.async_payment_succeeded') await setStatus(obj.metadata?.requestId, 'paid');
      else if (event.type === 'checkout.session.async_payment_failed') await setStatus(obj.metadata?.requestId, 'failed');
      return Response.json({ received: true });
    } catch (e) { console.error('Webhook error:', e); return new Response('Webhook error', { status: 400 }); }
  } } },
});
