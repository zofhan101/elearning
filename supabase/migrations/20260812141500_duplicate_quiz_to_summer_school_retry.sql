-- Retry of 20260812140000: the exact evaluation title lookup didn't
-- match (likely edited since creation, or a casing difference) — use a
-- more tolerant partial match instead of an exact string comparison.
DO $$
DECLARE
  v_source_course_id uuid;
  v_source_eval_id uuid;
  v_target_course_id uuid;
  v_new_eval_id uuid;
BEGIN
  SELECT id INTO v_source_course_id
  FROM public.courses
  WHERE title ILIKE 'COMMUNICABLES DISEASES'
  LIMIT 1;

  IF v_source_course_id IS NULL THEN
    RAISE EXCEPTION 'Source course "COMMUNICABLES DISEASES" not found.';
  END IF;

  SELECT id INTO v_source_eval_id
  FROM public.evaluations
  WHERE course_id = v_source_course_id
    AND title ILIKE '%Communicable%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_source_eval_id IS NULL THEN
    RAISE EXCEPTION 'No assessment mentioning "Communicable" was found in COMMUNICABLES DISEASES — list its evaluations to find the exact title.';
  END IF;

  SELECT id INTO v_target_course_id
  FROM public.courses
  WHERE title ILIKE '%SUMMER SCHOOL%2025%'
  LIMIT 1;

  IF v_target_course_id IS NULL THEN
    RAISE EXCEPTION 'Target course "SUMMER SCHOOL 2025" not found — check the exact course title and adjust this migration before re-running.';
  END IF;

  -- Duplicate the assessment itself
  INSERT INTO public.evaluations (course_id, title, description, mode, scheduled_at, duration_minutes, total_points, single_attempt)
  SELECT v_target_course_id, title, description, mode, scheduled_at, duration_minutes, total_points, single_attempt
  FROM public.evaluations
  WHERE id = v_source_eval_id
  RETURNING id INTO v_new_eval_id;

  -- Duplicate all of its questions, in the same order
  INSERT INTO public.questions (evaluation_id, kind, prompt, points, choices, correct, position)
  SELECT v_new_eval_id, kind, prompt, points, choices, correct, position
  FROM public.questions
  WHERE evaluation_id = v_source_eval_id
  ORDER BY position;
END $$;
