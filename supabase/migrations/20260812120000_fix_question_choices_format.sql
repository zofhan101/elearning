-- Bug fix: AdminQuestions.tsx was saving `choices` as a plain array of
-- strings (e.g. ["Option A", "Option B"]) and `correct` as numeric array
-- indices (e.g. [1]). But the student-facing quiz (Quiz.tsx / QuizResult.tsx)
-- has always expected `choices` as an array of {id, label} objects and
-- `correct` as an array of matching choice ids — a pre-existing mismatch
-- from the original app, unrelated to anything built in this project.
-- Any mcq_single / mcq_multi / true_false question saved before this fix
-- would render with blank, non-functional options for students.
--
-- This repairs any existing rows still in the old format by converting
-- each plain string choice into {id, label}, using sequential letters
-- (a, b, c, ...) as ids, and remapping numeric `correct` indices to the
-- matching letter id.
UPDATE public.questions q
SET
  choices = (
    SELECT jsonb_agg(
      jsonb_build_object('id', chr(97 + (ord - 1)::int), 'label', val)
      ORDER BY ord
    )
    FROM jsonb_array_elements_text(q.choices) WITH ORDINALITY AS t(val, ord)
  ),
  correct = (
    SELECT jsonb_agg(chr(97 + val::int))
    FROM jsonb_array_elements_text(q.correct) AS val
  )
WHERE q.kind IN ('mcq_single', 'mcq_multi', 'true_false')
  AND jsonb_typeof(q.choices) = 'array'
  AND jsonb_array_length(q.choices) > 0
  AND jsonb_typeof(q.choices -> 0) = 'string';
