CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text, last_name text, phone text, address text,
  lat double precision, lng double precision,
  gender text, birthdate date,
  emergency_name text, emergency_relation text, emergency_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cp_len CHECK (
    coalesce(length(first_name),0) <= 100 AND coalesce(length(last_name),0) <= 100 AND
    coalesce(length(phone),0) <= 20 AND coalesce(length(address),0) <= 500 AND
    coalesce(length(gender),0) <= 40 AND coalesce(length(emergency_name),0) <= 100 AND
    coalesce(length(emergency_relation),0) <= 60 AND coalesce(length(emergency_phone),0) <= 20)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_profiles TO service_role;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own client profile select" ON public.client_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own client profile insert" ON public.client_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own client profile update" ON public.client_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own client profile delete" ON public.client_profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER client_profiles_updated_at BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_cases (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, case_id)
);
GRANT SELECT ON public.client_cases TO authenticated;
GRANT ALL ON public.client_cases TO service_role;
ALTER TABLE public.client_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own case links" ON public.client_cases FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.link_my_cases(_codes text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _codes IS NULL OR array_length(_codes,1) IS NULL THEN RETURN 0; END IF;
  IF array_length(_codes,1) > 50 THEN RAISE EXCEPTION 'too many'; END IF;
  IF NOT public.check_rate_limit('link-cases', auth.uid()::text, 20, 3600) THEN RAISE EXCEPTION 'rate limited'; END IF;
  INSERT INTO public.client_cases (user_id, case_id)
  SELECT auth.uid(), c.id FROM public.cases c
  WHERE c.case_code = ANY(_codes) AND c.deleted_at IS NULL
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.my_cases()
RETURNS TABLE(case_code text, status text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.case_code, c.status, c.created_at, c.updated_at
  FROM public.client_cases cc JOIN public.cases c ON c.id = cc.case_id
  WHERE cc.user_id = auth.uid() AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.link_my_cases(text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_cases() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.link_my_cases(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_cases() TO authenticated;