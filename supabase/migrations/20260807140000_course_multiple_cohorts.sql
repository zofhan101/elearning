-- Allow a course to target multiple cohorts instead of a single one.

-- 1) New join table: course <-> many cohorts
CREATE TABLE public.course_cohorts (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, cohort_id)
);
CREATE INDEX idx_course_cohorts_cohort ON public.course_cohorts(cohort_id);

ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_cohorts_staff_all ON public.course_cohorts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 2) Migrate any existing single-cohort assignments into the new table
INSERT INTO public.course_cohorts (course_id, cohort_id)
SELECT id, cohort_id FROM public.courses WHERE cohort_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) A course with no rows in course_cohorts is visible to everyone (same
-- semantics as the old cohort_id IS NULL). A course with rows is visible to
-- staff, or to anyone who belongs to at least one of the linked cohorts.
CREATE OR REPLACE FUNCTION public.can_view_course(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_user_id) OR (
    NOT EXISTS (SELECT 1 FROM public.course_cohorts cc WHERE cc.course_id = _course_id)
    OR EXISTS (
      SELECT 1 FROM public.course_cohorts cc
      WHERE cc.course_id = _course_id AND public.is_in_cohort(_user_id, cc.cohort_id)
    )
  )
$$;

-- 4) Reuse can_view_course for the courses SELECT policy directly, so the
-- logic lives in one place.
DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated
  USING (public.can_view_course(auth.uid(), id));

-- Note: the old single-value courses.cohort_id column is left in place
-- (unused going forward) rather than dropped, consistent with how previous
-- deprecated fields were handled in this project.
