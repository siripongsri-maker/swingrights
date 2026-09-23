ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS first_response_by uuid,
  ADD COLUMN IF NOT EXISTS response_sla_met boolean;
CREATE INDEX IF NOT EXISTS cases_first_response_at_idx ON public.cases (first_response_at);

-- BEFORE trigger on cases: detect first response from assignment/status + maintain response_sla_met
CREATE OR REPLACE FUNCTION public.cases_first_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.first_response_at IS NOT NULL THEN
    NEW.first_response_at := OLD.first_response_at;
    NEW.first_response_by := OLD.first_response_by;
  ELSIF TG_OP = 'UPDATE' AND NEW.first_response_at IS NULL AND auth.uid() IS NOT NULL
     AND ((OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL)
          OR (OLD.status = 'received' AND NEW.status IS DISTINCT FROM 'received')) THEN
    NEW.first_response_at := now();
    NEW.first_response_by := auth.uid();
  END IF;
  NEW.response_sla_met := CASE WHEN NEW.first_response_at IS NULL THEN NULL
    ELSE NEW.first_response_at <= NEW.created_at + interval '24 hours' END;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.cases_first_response() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cases_first_response ON public.cases;
CREATE TRIGGER cases_first_response BEFORE INSERT OR UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.cases_first_response();

-- timeline (staff) / questions insert
CREATE OR REPLACE FUNCTION public.mark_first_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (TG_TABLE_NAME = 'case_questions' OR public.is_active_staff(auth.uid())) THEN
    UPDATE public.cases SET first_response_at = now(), first_response_by = auth.uid()
     WHERE id = NEW.case_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mark_first_response() FROM PUBLIC, anon, authenticated;

-- backfill
UPDATE public.cases c SET first_response_at = s.t, first_response_by = s.who FROM (
  SELECT DISTINCT ON (case_id) case_id, created_at t, who FROM (
    SELECT case_id, created_at, created_by who FROM public.case_timeline WHERE created_by IS NOT NULL
    UNION ALL SELECT case_id, created_at, asked_by FROM public.case_questions
  ) x ORDER BY case_id, created_at
) s WHERE s.case_id = c.id AND (c.first_response_at IS NULL OR s.t < c.first_response_at);
UPDATE public.cases SET response_sla_met = (first_response_at <= created_at + interval '24 hours')
 WHERE first_response_at IS NOT NULL;

-- stats with date filter
DROP FUNCTION IF EXISTS public.dashboard_stats(text);
CREATE OR REPLACE FUNCTION public.dashboard_stats(_branch text DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH f AS (
    SELECT * FROM public.cases
    WHERE public.is_active_staff(auth.uid()) AND deleted_at IS NULL
      AND (_branch IS NULL OR profile->>'branch' = _branch)
      AND (_from IS NULL OR created_at >= _from)
      AND (_to IS NULL OR created_at < _to)
  ), due AS (
    SELECT * FROM f WHERE created_at < now() - interval '24 hours' OR first_response_at IS NOT NULL
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'open', (SELECT count(*) FROM f WHERE status <> 'closed'),
    'suicide_risk', (SELECT count(*) FROM f WHERE suicide_risk),
    'unassigned', (SELECT count(*) FROM f WHERE assigned_to IS NULL),
    'overdue_follow_up', (SELECT count(*) FROM f WHERE follow_up_at IS NOT NULL AND follow_up_at < now() AND status <> 'closed'),
    'sla_total', (SELECT count(*) FROM due),
    'sla_met_count', (SELECT count(*) FROM due WHERE response_sla_met),
    'awaiting_response', (SELECT count(*) FROM f WHERE first_response_at IS NULL),
    'by_severity', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) s),
    'by_status', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT status k, count(*) c FROM f GROUP BY 1) s),
    'by_branch', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'branch','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_kp', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'kp','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_caseworker', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(assigned_to::text,'unassigned') k, count(*) c FROM f GROUP BY 1) s)
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.dashboard_stats(text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_stats(text, timestamptz, timestamptz) TO authenticated;

-- internal token for the hourly job (never exposed to the API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.settings (key text PRIMARY KEY, value text NOT NULL);
ALTER TABLE private.settings ENABLE ROW LEVEL SECURITY;
INSERT INTO private.settings (key, value)
  VALUES ('cron_token', encode(extensions.gen_random_bytes(32), 'hex'))
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_cron_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM private.settings WHERE key = 'cron_token' AND value = _token)
$$;
REVOKE EXECUTE ON FUNCTION public.verify_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_token(text) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;