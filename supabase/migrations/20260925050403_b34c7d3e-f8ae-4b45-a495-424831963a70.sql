REVOKE EXECUTE ON FUNCTION public.purge_unlinked_training() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rate_training_sample(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rate_training_sample(uuid, text) TO authenticated;