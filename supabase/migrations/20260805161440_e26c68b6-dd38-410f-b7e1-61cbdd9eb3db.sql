
-- staff profiles
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.staff_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_staff_profile(_display_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; uemail text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN; END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  INSERT INTO public.staff_profiles (id, email, display_name)
  VALUES (uid, uemail, COALESCE(_display_name, split_part(uemail, '@', 1)))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
    display_name = COALESCE(_display_name, public.staff_profiles.display_name);
END; $$;
GRANT EXECUTE ON FUNCTION public.ensure_staff_profile(text) TO authenticated;

-- case workflow columns
ALTER TABLE public.cases
  ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN follow_up_at timestamptz,
  ADD COLUMN ai_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_reviewed_by uuid,
  ADD COLUMN ai_reviewed_at timestamptz,
  ADD COLUMN screening jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN suicide_risk boolean NOT NULL DEFAULT false;

CREATE INDEX idx_cases_assigned_to ON public.cases (assigned_to);
CREATE INDEX idx_cases_created_at ON public.cases (created_at DESC);
CREATE INDEX idx_cases_status ON public.cases (status);
CREATE INDEX idx_cases_case_code ON public.cases (case_code);

-- de-identified alerts
CREATE TABLE public.case_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  case_code text NOT NULL,
  branch text,
  level text NOT NULL,
  kind text NOT NULL,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.case_alerts TO authenticated;
GRANT ALL ON public.case_alerts TO service_role;
ALTER TABLE public.case_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view alerts" ON public.case_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins ack alerts" ON public.case_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_alerts;

CREATE OR REPLACE FUNCTION public.raise_case_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl text; brnch text;
BEGIN
  lvl := COALESCE(NEW.severity, (NEW.ai_result->>'riskLevel'));
  brnch := NEW.profile->>'branch';
  IF NEW.suicide_risk THEN
    INSERT INTO public.case_alerts (case_id, case_code, branch, level, kind)
    VALUES (NEW.id, NEW.case_code, brnch, COALESCE(lvl,'high'), 'suicide_risk');
  ELSIF lvl IN ('red', 'high') THEN
    INSERT INTO public.case_alerts (case_id, case_code, branch, level, kind)
    VALUES (NEW.id, NEW.case_code, brnch, lvl, 'high_risk');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER cases_alert_insert AFTER INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.raise_case_alert();

-- export audit log
CREATE TABLE public.case_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  case_code text,
  format text NOT NULL,
  exported_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.case_exports TO authenticated;
GRANT ALL ON public.case_exports TO service_role;
ALTER TABLE public.case_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view exports" ON public.case_exports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins log exports" ON public.case_exports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND exported_by = auth.uid());

-- dashboard stats RPC
CREATE OR REPLACE FUNCTION public.dashboard_stats(_branch text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH f AS (
    SELECT * FROM public.cases
    WHERE public.has_role(auth.uid(), 'admin')
      AND (_branch IS NULL OR profile->>'branch' = _branch)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'open', (SELECT count(*) FROM f WHERE status <> 'closed'),
    'suicide_risk', (SELECT count(*) FROM f WHERE suicide_risk),
    'unassigned', (SELECT count(*) FROM f WHERE assigned_to IS NULL),
    'overdue_follow_up', (SELECT count(*) FROM f WHERE follow_up_at IS NOT NULL AND follow_up_at < now() AND status <> 'closed'),
    'by_severity', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(severity,'unset') k, count(*) c FROM f GROUP BY 1) s),
    'by_status', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT status k, count(*) c FROM f GROUP BY 1) s),
    'by_branch', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'branch','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_kp', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(profile->>'kp','ไม่ระบุ') k, count(*) c FROM f GROUP BY 1) s),
    'by_caseworker', (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb) FROM (SELECT COALESCE(assigned_to::text,'unassigned') k, count(*) c FROM f GROUP BY 1) s)
  );
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_stats(text) TO authenticated;
