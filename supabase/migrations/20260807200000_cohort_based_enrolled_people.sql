-- Course access is now driven entirely by cohort membership (see the
-- course_cohorts / is_in_cohort work). The old self-service "Enroll"
-- button is being removed from Explore, so "Enrolled People" (admin view)
-- needs a new source of truth: everyone who belongs to any cohort linked
-- to a course, whether or not they've activated their login yet.
CREATE OR REPLACE FUNCTION public.course_enrolled_personnel(_course_id uuid)
RETURNS TABLE (id uuid, nom text, prenom text, email_institutionnel text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.id, p.nom, p.prenom, p.email_institutionnel
  FROM public.personnel p
  WHERE EXISTS (
    SELECT 1 FROM public.course_cohorts cc
    WHERE cc.course_id = _course_id
      AND public.is_in_cohort(p.id, cc.cohort_id)
  )
  ORDER BY p.nom;
END;
$$;
