CREATE OR REPLACE FUNCTION public.track_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'received'),
    'in_progress', COUNT(*) FILTER (WHERE status IN ('in_progress','inprogress')),
    'closed', COUNT(*) FILTER (WHERE status IN ('completed','done','cancelled'))
  )
  FROM public.cases
  WHERE deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.track_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.track_public_stats() TO authenticated;