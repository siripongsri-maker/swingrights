-- Extend dashboard_overview with violation-type and occupation breakdowns
CREATE OR REPLACE FUNCTION public.dashboard_overview(_branch text DEFAULT NULL::text, _days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb; d int := LEAST(GREATEST(COALESCE(_days,30),1),3650);
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  WITH f AS (
    SELECT * FROM public.cases WHERE deleted_at IS NULL
      AND (_branch IS NULL OR profile->>'branch' = _branch)
      AND created_at >= now() - make_interval(days => d)
  ), allc AS (
    SELECT * FROM public.cases WHERE deleted_at IS NULL AND (_branch IS NULL OR profile->>'branch' = _branch)
  ), due AS (SELECT * FROM f WHERE created_at < now() - interval '24 hours' OR first_response_at IS NOT NULL),
  rf AS (SELECT cr.*, p.name pname FROM public.case_referrals cr JOIN f ON f.id = cr.case_id LEFT JOIN public.referral_partners p ON p.id = cr.partner_id),
  ages AS (SELECT CASE WHEN (profile->>'age') ~ '^\d{1,3}$' THEN
      CASE WHEN (profile->>'age')::int < 18 THEN '<18' WHEN (profile->>'age')::int < 25 THEN '18-24'
           WHEN (profile->>'age')::int < 35 THEN '25-34' WHEN (profile->>'age')::int < 45 THEN '35-44' ELSE '45+' END
      ELSE 'unspecified' END k FROM f),
  vt AS (
    SELECT CASE jsonb_typeof(e) WHEN 'string' THEN e #>> '{}' ELSE COALESCE(e->>'id', e->>'type', 'other') END k
    FROM f, LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(f.violation_types)='array' AND jsonb_array_length(f.violation_types)>0 THEN f.violation_types
           WHEN jsonb_typeof(f.profile->'initialViolationTypes')='array' THEN f.profile->'initialViolationTypes'
           ELSE '[]'::jsonb END) e
  )
  SELECT jsonb_build_object(
    'days', d,
    'total', (SELECT count(*) FROM f),
    'new_today', (SELECT count(*) FROM allc WHERE created_at >= date_trunc('day', now())),
    'new_7d', (SELECT count(*) FROM allc WHERE created_at >= now() - interval '7 days'),
    'open', (SELECT count(*) FROM allc WHERE status <> 'closed'),
    'unassigned_open', (SELECT count(*) FROM allc WHERE assigned_to IS NULL AND status <> 'closed'),
    'awaiting_response', (SELECT count(*) FROM allc WHERE first_response_at IS NULL AND status <> 'closed'),
    'overdue_24h', (SELECT count(*) FROM allc WHERE first_response_at IS NULL AND status <> 'closed' AND created_at < now() - interval '24 hours'),
    'overdue_follow_up', (SELECT count(*) FROM allc WHERE follow_up_at < now() AND status <> 'closed'),
    'sla_total', (SELECT count(*) FROM due),
    'sla_met', (SELECT count(*) FROM due WHERE response_sla_met),
    'avg_response_hours', (SELECT round(avg(extract(epoch FROM first_response_at - created_at))/3600.0, 1) FROM f WHERE first_response_at IS NOT NULL),
    'suicide_risk_open', (SELECT count(*) FROM allc WHERE suicide_risk AND status <> 'closed'),
    'high_risk_open', (SELECT count(*) FROM allc WHERE (severity = 'red' OR ai_result->>'riskLevel' IN ('red','high')) AND status <> 'closed'),
    'trafficking', (SELECT count(*) FROM f WHERE special_tests::text ILIKE '%nrm%' OR violation_types::text ILIKE '%traffick%'),
    'pii_flag', (SELECT count(*) FROM f WHERE pii_flag),
    'alerts_unacked', (SELECT count(*) FROM public.case_alerts a WHERE a.acknowledged_at IS NULL AND (_branch IS NULL OR a.branch = _branch)),
    'referrals_total', (SELECT count(*) FROM rf),
    'referrals_accepted', (SELECT count(*) FROM rf WHERE accepted_at IS NOT NULL OR outcome IN ('accepted','completed')),
    'referrals_declined', (SELECT count(*) FROM rf WHERE outcome IN ('declined','rejected')),
    'referrals_pending', (SELECT count(*) FROM rf WHERE accepted_at IS NULL AND COALESCE(outcome,'pending') NOT IN ('accepted','completed','declined','rejected')),
    'referrals_by_partner', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(pname,'—') k, count(*) c FROM rf GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x),
    'by_status', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT status k, count(*) c FROM f GROUP BY 1) x),
    'by_severity', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) x),
    'by_branch', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(NULLIF(profile->>'branch',''),'unspecified') k, count(*) c FROM f GROUP BY 1) x),
    'by_source', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT source k, count(*) c FROM f GROUP BY 1) x),
    'by_language', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT report_language k, count(*) c FROM f GROUP BY 1) x),
    'by_nationality', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(NULLIF(btrim(profile->>'nationality'),''),'unspecified') k, count(*) c FROM f GROUP BY 1 ORDER BY 2 DESC LIMIT 12) x),
    'by_gender', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(NULLIF(profile->>'gender',''),'unspecified') k, count(*) c FROM f GROUP BY 1) x),
    'by_age', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT k, count(*) c FROM ages GROUP BY 1) x),
    'by_violation', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT k, count(*) c FROM vt GROUP BY 1 ORDER BY 2 DESC LIMIT 15) x),
    'by_occupation', (SELECT COALESCE(jsonb_object_agg(k, c), '{}') FROM (SELECT COALESCE(NULLIF(btrim(profile->>'occupation'),''),'unspecified') k, count(*) c FROM f GROUP BY 1 ORDER BY 2 DESC LIMIT 15) x),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', dd::date, 'n', (SELECT count(*) FROM f WHERE created_at::date = dd::date)) ORDER BY dd), '[]')
              FROM generate_series(date_trunc('day', now()) - make_interval(days => LEAST(d,60)-1), date_trunc('day', now()), interval '1 day') dd),
    'ai_samples', (SELECT count(*) FROM public.ai_training_samples WHERE created_at >= now() - make_interval(days => d)),
    'ai_rated', (SELECT count(*) FROM public.ai_training_samples WHERE staff_rating IS NOT NULL AND created_at >= now() - make_interval(days => d))
  ) INTO r;
  RETURN r;
END $function$;

-- Extend project_summary with occupation, nationality, gender, language, source, trafficking and per-partner referrals
CREATE OR REPLACE FUNCTION public.project_summary(_from date, _to date, _branch text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT cr.*, p.name pname FROM public.case_referrals cr JOIN f ON f.id = cr.case_id LEFT JOIN public.referral_partners p ON p.id = cr.partner_id
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
    'cases_by_occupation', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(NULLIF(btrim(profile->>'occupation'),''),'unspecified') k, count(*) c FROM f GROUP BY 1 ORDER BY 2 DESC LIMIT 15) x),
    'cases_by_nationality', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(NULLIF(btrim(profile->>'nationality'),''),'unspecified') k, count(*) c FROM f GROUP BY 1 ORDER BY 2 DESC LIMIT 12) x),
    'cases_by_gender', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(NULLIF(profile->>'gender',''),'unspecified') k, count(*) c FROM f GROUP BY 1) x),
    'cases_by_language', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT report_language k, count(*) c FROM f GROUP BY 1) x),
    'cases_by_source', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT source k, count(*) c FROM f GROUP BY 1) x),
    'trafficking_count', public.suppress_small((SELECT count(*) FROM f WHERE special_tests::text ILIKE '%nrm%' OR violation_types::text ILIKE '%traffick%')),
    'sla_met_count', public.suppress_small(s.met),
    'sla_total', public.suppress_small(s.tot),
    'sla_percent', CASE WHEN s.tot >= 3 THEN round(100.0 * s.met / s.tot, 1) ELSE NULL END,
    'referrals_count', public.suppress_small((SELECT count(*) FROM rf)),
    'referrals_accepted_count', public.suppress_small((SELECT count(*) FROM rf WHERE accepted_at IS NOT NULL OR outcome IN ('accepted','completed'))),
    'referrals_by_partner', (SELECT COALESCE(jsonb_object_agg(k, public.suppress_small(c)), '{}') FROM (SELECT COALESCE(pname,'—') k, count(*) c FROM rf GROUP BY 1 ORDER BY 2 DESC LIMIT 15) x),
    'emergency_fund_cases', public.suppress_small((SELECT count(*) FROM f WHERE used_emergency_fund
        OR referral_note ILIKE ANY (ARRAY['%emergency fund%','%กองทุนฉุกเฉิน%'])
        OR answers::text ILIKE ANY (ARRAY['%emergency fund%','%กองทุนฉุกเฉิน%']))),
    'suicide_risk_count', public.suppress_small((SELECT count(*) FROM f WHERE suicide_risk))
  ) INTO r FROM s;
  RETURN r;
END $function$;