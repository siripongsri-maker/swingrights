REVOKE SELECT ON public.case_referrals FROM authenticated;
GRANT SELECT (id, case_id, partner_id, referred_at, referred_by, accepted_at, outcome, note, token_expires_at, responded_at)
  ON public.case_referrals TO authenticated;