ALTER TABLE public.quote_requests
  ADD COLUMN user_id uuid,
  ADD COLUMN payment_method text NOT NULL DEFAULT 'onsite',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN discount_code text,
  ADD COLUMN discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN base_amount numeric;

CREATE TABLE public.discount_codes (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9_-]{2,40}$'),
  percent numeric NOT NULL CHECK (percent > 0 AND percent <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_discounts ON public.discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_reviews ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_delete_reviews ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));