
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Cases
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'received',
  severity TEXT,
  has_violation BOOLEAN,
  violation_types JSONB DEFAULT '[]'::jsonb,
  violation_details JSONB DEFAULT '[]'::jsonb,
  special_tests JSONB DEFAULT '[]'::jsonb,
  reporter JSONB,
  victim JSONB,
  profile JSONB,
  answers JSONB DEFAULT '[]'::jsonb,
  staff_observations JSONB DEFAULT '[]'::jsonb,
  extra_facts TEXT,
  ai_result JSONB,
  referrals JSONB DEFAULT '[]'::jsonb,
  referral_note TEXT,
  signature_staff TEXT,
  signature_staff_name TEXT,
  signature_client TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Anonymous intake: anyone can insert
CREATE POLICY "anyone can insert cases" ON public.cases
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Admins can view/update/delete all
CREATE POLICY "admins view all cases" ON public.cases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update cases" ON public.cases
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete cases" ON public.cases
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public tracker lookup is done via edge function (service role) so no public SELECT policy needed.

-- Timeline
CREATE TABLE public.case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert timeline" ON public.case_timeline
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins view timeline" ON public.case_timeline
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update timeline" ON public.case_timeline
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
