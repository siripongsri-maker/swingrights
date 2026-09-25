CREATE TABLE public.swing_rights_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  guidance text NOT NULL DEFAULT '',
  examples jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_count int NOT NULL DEFAULT 0,
  good_count int NOT NULL DEFAULT 0,
  rejected_count int NOT NULL DEFAULT 0,
  real_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);
GRANT SELECT ON public.swing_rights_models TO authenticated;
GRANT ALL ON public.swing_rights_models TO service_role;
ALTER TABLE public.swing_rights_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read models" ON public.swing_rights_models FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX swing_rights_models_one_active ON public.swing_rights_models ((status)) WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.activate_swing_model(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.swing_rights_models SET status = 'archived' WHERE status = 'active';
  UPDATE public.swing_rights_models SET status = 'active', activated_at = now() WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.deactivate_swing_model()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.swing_rights_models SET status = 'archived' WHERE status = 'active';
END $$;
REVOKE EXECUTE ON FUNCTION public.activate_swing_model(uuid), public.deactivate_swing_model() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activate_swing_model(uuid), public.deactivate_swing_model() TO authenticated;