GRANT INSERT ON public.referral_partners TO authenticated;
CREATE POLICY "staff add agency partners" ON public.referral_partners
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff(auth.uid()) AND org_type = 'agency' AND active = true);