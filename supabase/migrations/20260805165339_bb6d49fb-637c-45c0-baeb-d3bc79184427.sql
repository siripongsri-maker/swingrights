-- 1) staff status
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_status_chk;
ALTER TABLE public.staff_profiles ADD CONSTRAINT staff_profiles_status_chk CHECK (status IN ('active','suspended'));

-- 2) helper functions
CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin','manager','caseworker','viewer','staff')
      AND COALESCE((SELECT sp.status FROM public.staff_profiles sp WHERE sp.id = _user_id), 'active') = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.has_role(_user_id,'admin') OR public.has_role(_user_id,'manager'))
     AND COALESCE((SELECT sp.status FROM public.staff_profiles sp WHERE sp.id = _user_id), 'active') = 'active'
$$;

CREATE OR REPLACE FUNCTION public.can_edit_case(_user_id uuid, _case_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage(_user_id)
     OR (
       public.has_role(_user_id,'caseworker')
       AND COALESCE((SELECT sp.status FROM public.staff_profiles sp WHERE sp.id = _user_id), 'active') = 'active'
       AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = _case_id AND c.assigned_to = _user_id)
     )
$$;

GRANT EXECUTE ON FUNCTION public.is_active_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_case(uuid, uuid) TO authenticated;

-- 3) cases policies
DROP POLICY IF EXISTS "admins view all cases" ON public.cases;
DROP POLICY IF EXISTS "admins update cases" ON public.cases;

CREATE POLICY "staff view cases" ON public.cases
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));

CREATE POLICY "managers update cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "caseworkers update own cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'caseworker')
    AND public.is_active_staff(auth.uid())
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(),'caseworker')
    AND public.is_active_staff(auth.uid())
    AND assigned_to = auth.uid()
  );

-- 4) timeline
DROP POLICY IF EXISTS "admins view timeline" ON public.case_timeline;
DROP POLICY IF EXISTS "admins update timeline" ON public.case_timeline;
DROP POLICY IF EXISTS "staff add timeline" ON public.case_timeline;

CREATE POLICY "staff view timeline" ON public.case_timeline
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));
CREATE POLICY "staff add timeline" ON public.case_timeline
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff(auth.uid()) AND NOT public.has_role(auth.uid(),'viewer'));
CREATE POLICY "managers update timeline" ON public.case_timeline
  FOR UPDATE TO authenticated USING (public.can_manage(auth.uid()));

-- 5) alerts
DROP POLICY IF EXISTS "admins view alerts" ON public.case_alerts;
DROP POLICY IF EXISTS "admins ack alerts" ON public.case_alerts;
CREATE POLICY "staff view alerts" ON public.case_alerts
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));
CREATE POLICY "staff ack alerts" ON public.case_alerts
  FOR UPDATE TO authenticated
  USING (public.is_active_staff(auth.uid()) AND NOT public.has_role(auth.uid(),'viewer'));

-- 6) exports
DROP POLICY IF EXISTS "admins log exports" ON public.case_exports;
DROP POLICY IF EXISTS "admins view exports" ON public.case_exports;
CREATE POLICY "staff log exports" ON public.case_exports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff(auth.uid()) AND exported_by = auth.uid());
CREATE POLICY "managers view exports" ON public.case_exports
  FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));

-- 7) audit / access log restricted to admin+manager
DROP POLICY IF EXISTS "admins view audit" ON public.case_audit;
CREATE POLICY "managers view audit" ON public.case_audit
  FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));

DROP POLICY IF EXISTS "admins view access log" ON public.case_access_log;
CREATE POLICY "managers view access log" ON public.case_access_log
  FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));

-- 8) user_roles management
DROP POLICY IF EXISTS "admins can view all roles" ON public.user_roles;
CREATE POLICY "managers view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 9) staff_profiles admin management
DROP POLICY IF EXISTS "staff view profiles" ON public.staff_profiles;
CREATE POLICY "staff view profiles" ON public.staff_profiles
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()) OR auth.uid() = id);
CREATE POLICY "admins manage profiles" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 10) dashboard stats open to all active staff
CREATE OR REPLACE FUNCTION public.dashboard_stats(_branch text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH f AS (
    SELECT * FROM public.cases
    WHERE public.is_active_staff(auth.uid())
      AND (_branch IS NULL OR profile->>'branch' = _branch)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'open', (SELECT count(*) FROM f WHERE status <> 'closed'),
    'suicide_risk', (SELECT count(*) FROM f WHERE suicide_risk),
    'unassigned', (SELECT count(*) FROM f WHERE assigned_to IS NULL),
    'overdue_follow_up', (SELECT count(*) FROM f WHERE follow_up_at IS NOT NULL AND follow_up_at < now() AND status <> 'closed'),
    'by_severity', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) s),
    'by_status', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT status k, count(*) c FROM f GROUP BY 1) s),
    'by_branch', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'branch','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_kp', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'kp','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_caseworker', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(assigned_to::text,'unassigned') k, count(*) c FROM f GROUP BY 1) s)
  );
$$;

-- 11) helper for current user's effective role
CREATE OR REPLACE FUNCTION public.my_access()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'roles', COALESCE((SELECT jsonb_agg(role) FROM public.user_roles WHERE user_id = auth.uid()), '[]'::jsonb),
    'status', COALESCE((SELECT status FROM public.staff_profiles WHERE id = auth.uid()), 'active')
  ) WHERE auth.uid() IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated;