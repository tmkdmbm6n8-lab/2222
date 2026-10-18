CREATE OR REPLACE FUNCTION public.open_availability_range(_slots jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE entry record; opened integer := 0; changed integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 IF jsonb_typeof(_slots) <> 'array' OR jsonb_array_length(_slots) < 1 OR jsonb_array_length(_slots) > 3000 THEN RAISE EXCEPTION 'Période invalide'; END IF;
 PERFORM pg_advisory_xact_lock(671001);
 FOR entry IN SELECT * FROM jsonb_to_recordset(_slots) AS s(starts_at timestamptz,ends_at timestamptz) LOOP
  IF entry.starts_at IS NULL OR entry.ends_at IS NULL OR entry.starts_at <= now() OR entry.ends_at <= entry.starts_at OR entry.ends_at > entry.starts_at + interval '24 hours' THEN RAISE EXCEPTION 'Créneau invalide'; END IF;
  INSERT INTO public.availability(starts_at,ends_at,enabled) VALUES(entry.starts_at,entry.ends_at,true)
  ON CONFLICT(starts_at) DO UPDATE SET enabled=true WHERE NOT availability.enabled;
  GET DIAGNOSTICS changed = ROW_COUNT; opened := opened + changed;
 END LOOP;
 RETURN opened;
END $$;
REVOKE ALL ON FUNCTION public.open_availability_range(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_availability_range(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_availability_range(jsonb) TO service_role;