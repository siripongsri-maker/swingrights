-- ============================================================
-- Security hardening: function privileges, policies, storage
-- ============================================================

-- 1) SECURITY DEFINER function EXECUTE lockdown ------------------
-- Internal-only functions (triggers + helpers used inside definer functions):
REVOKE EXECUTE ON FUNCTION public.audit_cases() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.raise_case_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gen_case_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mask_name(text) FROM PUBLIC;

-- Rate limiting is only invoked by edge functions via the service role:
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- Staff-only RPCs and RLS policy helpers: authenticated only, never anon:
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_case(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_case(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_staff_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_staff_profile(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.dashboard_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_stats(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_case_pii(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_case_pii(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.log_case_access(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_case_access(uuid, text, text) TO authenticated;

-- submit_case stays publicly callable BY DESIGN (anonymous victim intake form).
-- It validates consent, payload size and field values server-side.
GRANT EXECUTE ON FUNCTION public.submit_case(jsonb) TO anon, authenticated;

-- 2) case_alerts: exclude read-only viewers from seeing/receiving alerts ----
DROP POLICY IF EXISTS "staff view alerts" ON public.case_alerts;
CREATE POLICY "staff view alerts" ON public.case_alerts
  FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'viewer'));

-- 3) Explicit deny of direct inserts (case creation only via submit_case) ---
CREATE POLICY "no direct case inserts" ON public.cases
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "no direct pii inserts" ON public.case_pii
  FOR INSERT TO anon, authenticated WITH CHECK (false);

-- 4) staff_profiles: block self-service status/privilege changes ------------
CREATE OR REPLACE FUNCTION public.protect_staff_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Service role (admin edge function) runs with auth.uid() = NULL and is allowed.
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND (NEW.id IS DISTINCT FROM OLD.id
          OR NEW.status IS DISTINCT FROM OLD.status
          OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
          OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by) THEN
    RAISE EXCEPTION 'only admins can change staff account status';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.protect_staff_profile_admin_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS staff_profiles_protect_admin_fields ON public.staff_profiles;
CREATE TRIGGER staff_profiles_protect_admin_fields
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_staff_profile_admin_fields();

-- 5) Storage: no more anonymous direct uploads -------------------------------
DROP POLICY IF EXISTS "anyone can upload case audio" ON storage.objects;
DROP POLICY IF EXISTS "anyone can upload case photos" ON storage.objects;

CREATE POLICY "staff upload case audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-audio'
    AND (storage.foldername(name))[1] = 'cases'
    AND public.is_active_staff(auth.uid())
    AND NOT public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "staff upload case photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-photos'
    AND (storage.foldername(name))[1] = 'cases'
    AND public.is_active_staff(auth.uid())
    AND NOT public.has_role(auth.uid(), 'viewer')
  );