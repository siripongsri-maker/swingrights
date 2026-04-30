-- Restore permission for authenticated users to use the role-checking helper in RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Allow logged-in demo admin users to call the safe self-claim function
GRANT EXECUTE ON FUNCTION public.claim_demo_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_demo_admin() FROM anon, public;

-- Remove the trigger previously attached to the auth system to prevent login/signup database errors
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;

-- Keep the helper function available for manual/RPC use, but do not attach it to auth.users
CREATE OR REPLACE FUNCTION public.claim_demo_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  uemail text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  IF uemail = 'admin@swing.demo' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_demo_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_demo_admin() FROM anon, public;

-- Ensure the current demo admin account has the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@swing.demo'
ON CONFLICT DO NOTHING;