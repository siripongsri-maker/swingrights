ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS document_drafts jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cases.document_drafts IS
  'De-identified structured document drafts keyed by document kind; includes generated/review metadata. Must not contain PII.';