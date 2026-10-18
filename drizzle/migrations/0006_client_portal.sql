CREATE TABLE public.profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', postal_code TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', photo_path TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.client_notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, request_id UUID, title TEXT NOT NULL, body TEXT NOT NULL, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, UPDATE, INSERT ON public.client_notifications TO authenticated;
GRANT ALL ON public.client_notifications TO service_role;
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own_select ON public.client_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_own_update ON public.client_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_admin_insert ON public.client_notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.request_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE, sender_id UUID NOT NULL, is_admin BOOLEAN NOT NULL DEFAULT false, body TEXT NOT NULL DEFAULT '', attachment TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.request_messages TO authenticated;
GRANT ALL ON public.request_messages TO service_role;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON public.request_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = request_id AND q.user_id = auth.uid()));
CREATE POLICY messages_insert ON public.request_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = request_id AND q.user_id = auth.uid())));

CREATE POLICY client_media_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-media' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY client_media_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));