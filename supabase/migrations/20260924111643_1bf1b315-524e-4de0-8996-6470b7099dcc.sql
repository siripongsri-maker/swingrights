CREATE TABLE public.case_answer_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  answer_index int NOT NULL,
  action text NOT NULL,
  question text,
  old_transcript text,
  new_transcript text,
  edited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_answer_revisions TO authenticated;
GRANT ALL ON public.case_answer_revisions TO service_role;
ALTER TABLE public.case_answer_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view answer revisions" ON public.case_answer_revisions
  FOR SELECT TO authenticated USING (public.is_active_staff(auth.uid()));
CREATE INDEX ON public.case_answer_revisions(case_id, created_at);

CREATE OR REPLACE FUNCTION public.staff_edit_answer(_case_id uuid, _index int, _question text, _transcript text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _answers jsonb;
  _old jsonb;
  _new jsonb;
  _i int;
BEGIN
  IF _uid IS NULL OR NOT public.can_edit_case(_uid, _case_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  _transcript := left(coalesce(_transcript, ''), 5000);
  _question := left(coalesce(_question, ''), 500);
  SELECT coalesce(answers, '[]'::jsonb) INTO _answers FROM cases WHERE id = _case_id FOR UPDATE;
  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array' THEN _answers := '[]'::jsonb; END IF;

  IF _index IS NULL THEN
    IF length(trim(_question)) = 0 OR length(trim(_transcript)) = 0 THEN RAISE EXCEPTION 'empty'; END IF;
    _i := jsonb_array_length(_answers);
    _new := jsonb_build_object('question', _question, 'cat', 'staff_added', 'frame', '', 'transcript', _transcript,
      'added_by', _uid, 'edited_at', now());
    _answers := _answers || jsonb_build_array(_new);
    INSERT INTO case_answer_revisions(case_id, answer_index, action, question, old_transcript, new_transcript, edited_by)
      VALUES (_case_id, _i, 'add', _question, NULL, _transcript, _uid);
  ELSE
    IF _index < 0 OR _index >= jsonb_array_length(_answers) THEN RAISE EXCEPTION 'bad index'; END IF;
    _old := _answers -> _index;
    _new := _old || jsonb_build_object('transcript', _transcript, 'edited_by', _uid, 'edited_at', now());
    IF length(trim(_question)) > 0 AND (_old->>'cat') = 'staff_added' THEN
      _new := _new || jsonb_build_object('question', _question);
    END IF;
    _answers := jsonb_set(_answers, ARRAY[_index::text], _new);
    INSERT INTO case_answer_revisions(case_id, answer_index, action, question, old_transcript, new_transcript, edited_by)
      VALUES (_case_id, _index, 'edit', _new->>'question', _old->>'transcript', _transcript, _uid);
  END IF;

  UPDATE cases SET answers = _answers, updated_at = now() WHERE id = _case_id;
  RETURN _answers;
END $$;
REVOKE ALL ON FUNCTION public.staff_edit_answer(uuid, int, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_edit_answer(uuid, int, text, text) TO authenticated;