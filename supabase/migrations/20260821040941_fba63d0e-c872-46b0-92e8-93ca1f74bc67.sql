-- Remove leftover direct EXECUTE grants to anon/authenticated on internal functions
REVOKE EXECUTE ON FUNCTION public.audit_cases() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.raise_case_alert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_staff_profile_admin_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_name(text) FROM anon, authenticated;

-- Staff-only functions: keep signed-in staff, block anonymous callers
REVOKE EXECUTE ON FUNCTION public.can_edit_case(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_access() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_staff_profile(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_stats(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_case_pii(uuid) FROM anon;