-- Function to allow demo admin to self-claim admin role
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
  IF uid IS NULL THEN RETURN false; END IF;
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

-- Ensure trigger exists on auth.users for new admin signups
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- Backfill any existing admin@swing.demo users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@swing.demo'
ON CONFLICT DO NOTHING;