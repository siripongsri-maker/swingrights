ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS used_emergency_fund boolean NOT NULL DEFAULT false;
ALTER TABLE public.case_exports ADD COLUMN IF NOT EXISTS detail text;

CREATE OR REPLACE FUNCTION public.suppress_small(_n bigint)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _n > 0 AND _n < 3 THEN to_jsonb('<3'::text) ELSE to_jsonb(_n) END
$$;

CREATE OR REPLACE FUNCTION public.project_summary(_from date, _to date, _branch text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.is_active_staff(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  WITH f AS (
    SELECT * FROM public.cases
    WHERE deleted_at IS NULL
      AND created_at >= _from::timestamptz
      AND created_at < (_to + 1)::timestamptz
      AND (_branch IS NULL OR profile->>'branch' = _branch)
  ), due AS (
    SELECT * FROM f WHERE created_at < now() - interval '24 hours' OR first_response_at IS NOT NULL
  ), vt AS (
    SELECT CASE jsonb_typeof(e) WHEN 'string' THEN e #>> '{}' ELSE COALESCE(e->>'id', e->>'type', 'other') END k
    FROM f, LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(f.violation_types)='array' AND jsonb_array_length(f.violation_types)>0 THEN f.violation_types
           WHEN jsonb_typeof(f.profile->'initialViolationTypes')='array' THEN f.profile->'initialViolationTypes'
           ELSE '[]'::jsonb END) e
  ), grp AS (
    SELECT CASE
      WHEN upper(profile->>'kp') IN ('MSM','MSW','FSW','TGSW') THEN upper(profile->>'kp')
      WHEN upper(profile->>'kp') IN ('TG','TGW') THEN 'TGSW'
      WHEN COALESCE(profile->>'nationality','') <> '' AND profile->>'nationality' NOT ILIKE '%ไทย%' AND profile->>'nationality' NOT ILIKE 'thai%' THEN 'migrant'
      ELSE 'other' END k
    FROM f
  ), rf AS (
    SELECT cr.* FROM public.case_referrals cr JOIN f ON f.id = cr.case_id
  ), s AS (
    SELECT (SELECT count(*) FROM due) tot, (SELECT count(*) FROM due WHERE response_sla_met) met
  )
  SELECT jsonb_build_object(
    'from', _from, 'to', _to, 'branch', _branch,
    'total_cases', public.suppress_small((SELECT count(*) FROM f)),
    'cases_by_branch', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(NULLIF(profile->>'branch',''),'unspecified') k, count(*) c FROM f GROUP BY 1) x),
    'cases_by_violation_type', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT k, count(*) c FROM vt GROUP BY 1) x),
    'cases_by_client_group', (SELECT jsonb_object_agg(g, public.suppress_small((SELECT count(*) FROM grp WHERE grp.k = g))) FROM unnest(ARRAY['MSM','MSW','FSW','TGSW','migrant','other']) g),
    'cases_by_severity', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) x),
    'sla_met_count', public.suppress_small(s.met),
    'sla_total', public.suppress_small(s.tot),
    'sla_percent', CASE WHEN s.tot >= 3 THEN round(100.0 * s.met / s.tot, 1) ELSE NULL END,
    'referrals_count', public.suppress_small((SELECT count(*) FROM rf)),
    'referrals_accepted_count', public.suppress_small((SELECT count(*) FROM rf WHERE accepted_at IS NOT NULL OR outcome IN ('accepted','completed'))),
    'emergency_fund_cases', public.suppress_small((SELECT count(*) FROM f WHERE used_emergency_fund
        OR referral_note ILIKE ANY (ARRAY['%emergency fund%','%กองทุนฉุกเฉิน%'])
        OR answers::text ILIKE ANY (ARRAY['%emergency fund%','%กองทุนฉุกเฉิน%']))),
    'suicide_risk_count', public.suppress_small((SELECT count(*) FROM f WHERE suicide_risk))
  ) INTO r FROM s;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.project_summary(date,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_summary(date,date,text) TO authenticated;