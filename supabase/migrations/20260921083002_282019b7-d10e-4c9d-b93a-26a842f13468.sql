CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_visits_session_id ON public.site_visits(session_id);

GRANT INSERT ON public.site_visits TO anon;
GRANT INSERT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow recording site visits"
ON public.site_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_site_visit(_session_id text, _path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.site_visits (session_id, path)
  VALUES (_session_id, _path);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS TABLE(registered_users bigint, unique_visitors bigint, total_visits bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM auth.users),
    (SELECT count(DISTINCT session_id) FROM public.site_visits),
    (SELECT count(*) FROM public.site_visits);
END;
$$;