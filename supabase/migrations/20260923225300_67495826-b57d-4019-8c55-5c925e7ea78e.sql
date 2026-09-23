ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_first_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_active_staff(auth.uid()) THEN
    UPDATE public.cases SET first_response_at = now()
     WHERE id = NEW.case_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mark_first_response() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS timeline_first_response ON public.case_timeline;
CREATE TRIGGER timeline_first_response AFTER INSERT ON public.case_timeline
  FOR EACH ROW EXECUTE FUNCTION public.mark_first_response();
DROP TRIGGER IF EXISTS questions_first_response ON public.case_questions;
CREATE TRIGGER questions_first_response AFTER INSERT ON public.case_questions
  FOR EACH ROW EXECUTE FUNCTION public.mark_first_response();

UPDATE public.cases c SET first_response_at = s.t FROM (
  SELECT case_id, min(created_at) t FROM (
    SELECT case_id, created_at FROM public.case_timeline WHERE created_by IS NOT NULL
    UNION ALL SELECT case_id, created_at FROM public.case_questions WHERE asked_by IS NOT NULL
  ) x GROUP BY case_id
) s WHERE s.case_id = c.id AND c.first_response_at IS NULL;

CREATE OR REPLACE FUNCTION public.dashboard_stats(_branch text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH f AS (
    SELECT * FROM public.cases
    WHERE public.is_active_staff(auth.uid()) AND deleted_at IS NULL
      AND (_branch IS NULL OR profile->>'branch' = _branch)
  ), due AS (
    SELECT * FROM f WHERE created_at < now() - interval '24 hours' OR first_response_at IS NOT NULL
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'open', (SELECT count(*) FROM f WHERE status <> 'closed'),
    'suicide_risk', (SELECT count(*) FROM f WHERE suicide_risk),
    'unassigned', (SELECT count(*) FROM f WHERE assigned_to IS NULL),
    'overdue_follow_up', (SELECT count(*) FROM f WHERE follow_up_at IS NOT NULL AND follow_up_at < now() AND status <> 'closed'),
    'kpi_due', (SELECT count(*) FROM due),
    'kpi_met', (SELECT count(*) FROM due WHERE first_response_at IS NOT NULL AND first_response_at <= created_at + interval '24 hours'),
    'awaiting_response', (SELECT count(*) FROM f WHERE first_response_at IS NULL),
    'by_severity', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) s),
    'by_status', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT status k, count(*) c FROM f GROUP BY 1) s),
    'by_branch', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'branch','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_kp', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'kp','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_caseworker', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(assigned_to::text,'unassigned') k, count(*) c FROM f GROUP BY 1) s)
  );
$function$;