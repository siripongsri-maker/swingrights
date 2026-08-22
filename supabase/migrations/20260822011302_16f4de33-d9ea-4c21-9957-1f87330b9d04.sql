-- Replace the security-definer view with column-level grants + a narrow anon policy.
DROP VIEW IF EXISTS public.referral_directory;

-- Anonymous + signed-in users may read ONLY these public directory columns.
GRANT SELECT (id, name, org_type, province, district, phone, services) ON public.referral_partners TO anon;

-- Anonymous visitors see active partners only (public hotline/partner directory).
CREATE POLICY "public view active partner directory" ON public.referral_partners
  FOR SELECT TO anon USING (active);