-- Corrected version of the "move assessment" migration, updated for the
-- module_id → counts_toward_certificate architecture fix (20260814110000).
-- "Move to the Communicables Diseases module" now means: change the
-- evaluation's course_id to that of the COMMUNICABLES DISEASES course
-- (the UI-"Module"), and flag it as counting toward that module's
-- certificate.
DO $$
DECLARE
  v_eval_id uuid;
  v_target_course_id uuid;
BEGIN
  SELECT id INTO v_target_course_id
  FROM public.courses
  WHERE title ILIKE 'COMMUNICABLES DISEASES'
  ORDER BY created_at
  LIMIT 1;

  IF v_target_course_id IS NULL THEN
    RAISE EXCEPTION 'No module (course) titled "COMMUNICABLES DISEASES" was found — check the exact title and adjust this migration before re-running.';
  END IF;

  SELECT e.id INTO v_eval_id
  FROM public.evaluations e
  JOIN public.courses c ON c.id = e.course_id
  WHERE c.title ILIKE '%SUMMER SCHOOL%2025%'
    AND e.title ILIKE '%Communicable Disease%'
  ORDER BY e.created_at
  LIMIT 1;

  IF v_eval_id IS NULL THEN
    RAISE EXCEPTION 'No "Communicable Disease" assessment found under a Summer School 2025 module — check the exact assessment title and adjust this migration before re-running.';
  END IF;

  UPDATE public.evaluations
  SET course_id = v_target_course_id, counts_toward_certificate = true
  WHERE id = v_eval_id;
END $$;
