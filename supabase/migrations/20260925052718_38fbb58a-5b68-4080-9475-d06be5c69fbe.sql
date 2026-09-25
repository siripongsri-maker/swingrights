CREATE OR REPLACE FUNCTION public.dashboard_overview(_branch text DEFAULT NULL, _days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
      ELSE 'unspecified' END k FROM f)
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
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', dd::date, 'n', (SELECT count(*) FROM f WHERE created_at::date = dd::date)) ORDER BY dd), '[]')
              FROM generate_series(date_trunc('day', now()) - make_interval(days => LEAST(d,60)-1), date_trunc('day', now()), interval '1 day') dd),
    'ai_samples', (SELECT count(*) FROM public.ai_training_samples WHERE created_at >= now() - make_interval(days => d)),
    'ai_rated', (SELECT count(*) FROM public.ai_training_samples WHERE staff_rating IS NOT NULL AND created_at >= now() - make_interval(days => d))
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_users_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') AND public.can_manage(auth.uid())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'staff', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'), '[]') FROM (
      SELECT jsonb_build_object('id', sp.id,
        'name', public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))),
        'status', sp.status,
        'roles', ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = sp.id),
        'assigned_open', (SELECT count(*) FROM public.cases c WHERE c.assigned_to = sp.id AND c.status <> 'closed' AND c.deleted_at IS NULL),
        'views_30d', (SELECT count(*) FROM public.case_access_log l WHERE l.actor = sp.id AND l.created_at > now() - interval '30 days'),
        'exports_30d', (SELECT count(*) FROM public.case_exports e WHERE e.exported_by = sp.id AND e.created_at > now() - interval '30 days'),
        'last_login', u.last_sign_in_at) x
      FROM public.staff_profiles sp LEFT JOIN auth.users u ON u.id = sp.id) s),
    'reporters', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]') FROM (
      SELECT jsonb_build_object('id', cp.id,
        'name', public.mask_name(NULLIF(btrim(COALESCE(cp.first_name,'') || ' ' || COALESCE(cp.last_name,'')),'')),
        'gender', cp.gender,
        'provider', u.raw_app_meta_data->>'provider',
        'has_emergency', cp.emergency_phone IS NOT NULL AND cp.emergency_phone <> '',
        'cases', (SELECT count(*) FROM public.client_cases cc WHERE cc.user_id = cp.id),
        'created_at', cp.created_at, 'last_login', u.last_sign_in_at) x
      FROM public.client_profiles cp LEFT JOIN auth.users u ON u.id = cp.id LIMIT 500) s),
    'visits_total', (SELECT count(*) FROM public.site_visits),
    'visitors_total', (SELECT count(DISTINCT session_id) FROM public.site_visits),
    'visits_daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', dd::date,
        'visits', (SELECT count(*) FROM public.site_visits v WHERE v.visited_at::date = dd::date),
        'visitors', (SELECT count(DISTINCT session_id) FROM public.site_visits v WHERE v.visited_at::date = dd::date)) ORDER BY dd), '[]')
      FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') dd),
    'top_paths', (SELECT COALESCE(jsonb_object_agg(path, c), '{}') FROM (SELECT path, count(*) c FROM public.site_visits WHERE visited_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_activity_log(_kind text DEFAULT 'all', _limit integer DEFAULT 200)
RETURNS TABLE(at timestamptz, kind text, action text, case_code text, actor text, detail text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int := LEAST(GREATEST(COALESCE(_limit,200),1),1000);
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') AND public.can_manage(auth.uid())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT l.created_at, 'view'::text, l.action, l.case_code,
      public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))), l.detail
    FROM public.case_access_log l LEFT JOIN public.staff_profiles sp ON sp.id = l.actor
    WHERE _kind IN ('all','view')
    UNION ALL
    SELECT e.created_at, 'export', e.format, e.case_code,
      public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))), e.detail
    FROM public.case_exports e LEFT JOIN public.staff_profiles sp ON sp.id = e.exported_by
    WHERE _kind IN ('all','export')
    UNION ALL
    SELECT a.created_at, 'change', a.action, a.case_code,
      COALESCE(public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))), 'system'),
      array_to_string(a.changed_fields, ', ')
    FROM public.case_audit a LEFT JOIN public.staff_profiles sp ON sp.id = a.actor
    WHERE _kind IN ('all','change')
    UNION ALL
    SELECT r.created_at, 'change', 'answer_' || r.action, c.case_code,
      public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))), left(r.question, 120)
    FROM public.case_answer_revisions r LEFT JOIN public.cases c ON c.id = r.case_id LEFT JOIN public.staff_profiles sp ON sp.id = r.edited_by
    WHERE _kind IN ('all','change')
    UNION ALL
    SELECT s.created_at, 'ai', COALESCE('rated_' || s.staff_rating, 'followup_' || s.lang), c.case_code,
      COALESCE(public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))), 'AI'),
      left(NULLIF(s.followup,''), 160)
    FROM public.ai_training_samples s LEFT JOIN public.cases c ON c.id = s.case_id LEFT JOIN public.staff_profiles sp ON sp.id = s.rated_by
    WHERE _kind IN ('all','ai')
  ) u ORDER BY 1 DESC LIMIT n;
END $$;

REVOKE ALL ON FUNCTION public.dashboard_overview(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_activity_log(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_overview(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(text, integer) TO authenticated;