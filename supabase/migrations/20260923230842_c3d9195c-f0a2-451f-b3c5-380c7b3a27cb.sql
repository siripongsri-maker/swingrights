ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS escalation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_level text;

CREATE TABLE public.access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  reviewed_by uuid NOT NULL DEFAULT auth.uid(),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_reviews TO authenticated;
GRANT ALL ON public.access_reviews TO service_role;
ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers view reviews" ON public.access_reviews FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
CREATE POLICY "managers add reviews" ON public.access_reviews FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(auth.uid()) AND reviewed_by = auth.uid());

CREATE OR REPLACE FUNCTION public.access_review(_month date)
RETURNS TABLE(user_id uuid, name_masked text, status text, roles text[], case_views bigint, exports bigint, last_login timestamptz, last_activity timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m0 timestamptz := date_trunc('month', _month)::timestamptz; m1 timestamptz := (date_trunc('month', _month) + interval '1 month')::timestamptz;
BEGIN
  IF NOT public.can_manage(auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT sp.id,
    public.mask_name(COALESCE(NULLIF(sp.display_name,''), split_part(sp.email,'@',1))),
    sp.status,
    ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = sp.id),
    (SELECT count(*) FROM public.case_access_log l WHERE l.actor = sp.id AND l.created_at >= m0 AND l.created_at < m1),
    (SELECT count(*) FROM public.case_exports e WHERE e.exported_by = sp.id AND e.created_at >= m0 AND e.created_at < m1),
    u.last_sign_in_at,
    GREATEST(u.last_sign_in_at,
      (SELECT max(l.created_at) FROM public.case_access_log l WHERE l.actor = sp.id),
      (SELECT max(e.created_at) FROM public.case_exports e WHERE e.exported_by = sp.id))
  FROM public.staff_profiles sp LEFT JOIN auth.users u ON u.id = sp.id
  ORDER BY 2;
END $$;
REVOKE ALL ON FUNCTION public.access_review(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_review(date) TO authenticated;