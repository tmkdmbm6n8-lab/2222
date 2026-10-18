-- Tables de suivi SAV TClean.
CREATE TABLE IF NOT EXISTS public.support_tickets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 subject TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved')),
 attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 is_admin BOOLEAN NOT NULL DEFAULT false,
 body TEXT NOT NULL DEFAULT '',
 attachment TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_tickets, public.support_ticket_messages TO service_role;
CREATE POLICY support_tickets_read_own_or_admin ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY support_tickets_create_own ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY support_tickets_admin_update ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY support_ticket_messages_read_own_or_admin ON public.support_ticket_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY support_ticket_messages_create_own_or_admin ON public.support_ticket_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())));
