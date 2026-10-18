ALTER TABLE public.quote_requests ADD COLUMN booking_period tstzrange;
UPDATE public.quote_requests q SET booking_period=tstzrange(a.starts_at, greatest(a.ends_at,a.starts_at + interval '3 hours'),'[)') FROM public.availability a WHERE q.slot_id=a.id;
ALTER TABLE public.quote_requests ADD CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (booking_period WITH &&) WHERE (status IN ('pending','confirmed') AND booking_period IS NOT NULL);
CREATE OR REPLACE FUNCTION public.validate_booking_slot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.availability; duration integer;
BEGIN
 IF NEW.slot_id IS NOT NULL AND NEW.status IN ('pending','confirmed') THEN
  SELECT * INTO s FROM public.availability WHERE id=NEW.slot_id FOR UPDATE;
  IF s.id IS NULL OR NOT s.enabled OR s.starts_at<=now() THEN RAISE EXCEPTION 'Créneau indisponible'; END IF;
  IF TG_OP='INSERT' OR NEW.slot_id IS DISTINCT FROM OLD.slot_id OR NEW.booking_period IS NULL THEN
   SELECT greatest(30,least(1440,coalesce((config->>'bookingDuration')::integer,180))) INTO duration FROM public.business_settings WHERE id='main';
   NEW.booking_period:=tstzrange(s.starts_at,greatest(s.ends_at,s.starts_at + make_interval(mins=>coalesce(duration,180))),'[)');
  ELSE
   NEW.booking_period:=OLD.booking_period;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.prevent_overlapping_slots() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(671001);
 IF NEW.enabled AND EXISTS(SELECT 1 FROM public.availability WHERE id<>NEW.id AND enabled AND starts_at=NEW.starts_at) THEN RAISE EXCEPTION 'Cette heure est déjà proposée'; END IF;
 IF TG_OP='UPDATE' AND (NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at) AND EXISTS(SELECT 1 FROM public.quote_requests WHERE slot_id=NEW.id AND status IN ('pending','confirmed')) THEN RAISE EXCEPTION 'Annulez ou déplacez la réservation avant de modifier ce créneau'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.list_booking_slots() RETURNS TABLE(id uuid, starts_at timestamptz, ends_at timestamptz, available boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH settings AS (SELECT greatest(30,least(1440,coalesce((SELECT (config->>'bookingDuration')::integer FROM public.business_settings WHERE id='main'),180))) AS duration)
 SELECT a.id,a.starts_at,greatest(a.ends_at,a.starts_at+make_interval(mins=>settings.duration)),
 NOT EXISTS(SELECT 1 FROM public.quote_requests q WHERE q.status IN ('pending','confirmed') AND (q.slot_id=a.id OR q.booking_period && tstzrange(a.starts_at,greatest(a.ends_at,a.starts_at+make_interval(mins=>settings.duration)),'[)')))
 FROM public.availability a CROSS JOIN settings WHERE a.enabled AND a.starts_at>now() ORDER BY a.starts_at LIMIT 2000
$$;
REVOKE ALL ON FUNCTION public.list_booking_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_booking_slots() TO anon,authenticated,service_role;