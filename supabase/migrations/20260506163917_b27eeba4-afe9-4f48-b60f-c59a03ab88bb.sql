
-- Cohorts
CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mention mention_type,
  parcours parcours_type,
  niveau niveau_etude,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cohorts_filters ON public.cohorts(mention, parcours, niveau);

CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id)
);
CREATE INDEX idx_cohort_members_user ON public.cohort_members(user_id);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

-- Targeting columns
ALTER TABLE public.courses ADD COLUMN cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.modules ADD COLUMN cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;
ALTER TABLE public.content_blocks ADD COLUMN cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;

-- Membership function
CREATE OR REPLACE FUNCTION public.is_in_cohort(_user_id uuid, _cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _cohort_id IS NULL
    OR EXISTS (SELECT 1 FROM public.cohort_members WHERE cohort_id = _cohort_id AND user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.cohorts c
      LEFT JOIN public.personnel p ON p.id = _user_id
      WHERE c.id = _cohort_id
        AND (c.mention IS NOT NULL OR c.parcours IS NOT NULL OR c.niveau IS NOT NULL)
        AND (c.mention IS NULL OR c.mention = p.mention)
        AND (c.parcours IS NULL OR c.parcours = p.parcours)
        AND (c.niveau IS NULL OR c.niveau = p.niveau)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_view_course(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_user_id) OR EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = _course_id
      AND (c.cohort_id IS NULL OR public.is_in_cohort(_user_id, c.cohort_id))
  )
$$;

-- RLS policies for cohorts
CREATE POLICY cohorts_select ON public.cohorts FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM cohort_members m WHERE m.cohort_id = cohorts.id AND m.user_id = auth.uid()) OR is_in_cohort(auth.uid(), cohorts.id));
CREATE POLICY cohorts_staff_write ON public.cohorts FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE POLICY cohort_members_select ON public.cohort_members FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY cohort_members_staff_write ON public.cohort_members FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- Update SELECT policies to filter by cohort
DROP POLICY IF EXISTS courses_select_all ON public.courses;
CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR cohort_id IS NULL OR is_in_cohort(auth.uid(), cohort_id));

DROP POLICY IF EXISTS modules_select_all ON public.modules;
CREATE POLICY modules_select ON public.modules FOR SELECT TO authenticated
  USING (
    is_staff(auth.uid())
    OR ((cohort_id IS NULL OR is_in_cohort(auth.uid(), cohort_id))
        AND can_view_course(auth.uid(), course_id))
  );

DROP POLICY IF EXISTS content_select_all ON public.content_blocks;
CREATE POLICY content_select ON public.content_blocks FOR SELECT TO authenticated
  USING (
    is_staff(auth.uid())
    OR ((cohort_id IS NULL OR is_in_cohort(auth.uid(), cohort_id))
        AND EXISTS (
          SELECT 1 FROM modules m WHERE m.id = content_blocks.module_id
            AND (m.cohort_id IS NULL OR is_in_cohort(auth.uid(), m.cohort_id))
            AND can_view_course(auth.uid(), m.course_id)
        ))
  );
