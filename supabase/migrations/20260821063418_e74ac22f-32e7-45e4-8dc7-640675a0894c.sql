-- Explicit deny-all policy: rate_limits is internal-only (accessed via check_rate_limit security definer)
CREATE POLICY "no direct access" ON public.rate_limits
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);