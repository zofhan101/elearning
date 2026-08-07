-- Simplify roles to three tiers: admin (full access), instructor (Teacher/Lecturer),
-- student (Student/Learner). The staff_admin role is retired and merged into instructor.

-- 1) Migrate any existing staff_admin role assignments to instructor
UPDATE public.user_roles SET role = 'instructor' WHERE role = 'staff_admin';

-- 2) Migrate any shared folders targeted at the staff_admin audience to teachers
UPDATE public.shared_folders SET audience = 'teachers' WHERE audience = 'staff_admin';

-- 3) Simplify in_audience: drop the staff_admin branch
CREATE OR REPLACE FUNCTION public.in_audience(_user_id uuid, _audience share_audience)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _audience = 'all'
    OR (_audience = 'teachers' AND (public.has_role(_user_id, 'instructor'::app_role) OR public.has_role(_user_id, 'admin'::app_role)))
    OR (_audience = 'students' AND public.has_role(_user_id, 'student'::app_role))
$$;

-- 4) Simplify can_write_audience: drop the staff_admin branch
CREATE OR REPLACE FUNCTION public.can_write_audience(_user_id uuid, _audience share_audience)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR (
      _audience IN ('teachers','students','all')
      AND public.has_role(_user_id, 'instructor'::app_role)
    )
$function$;

-- 5) personnel table: staff_admin could previously view all personnel records.
-- That visibility is now restricted to admin only (instructor does not inherit it).
DROP POLICY IF EXISTS personnel_select_self_or_staff ON public.personnel;
CREATE POLICY personnel_select_self_or_staff
ON public.personnel FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Note: 'staff_admin' remains a defined value in the app_role and share_audience
-- enum types at the database level (Postgres does not support dropping enum
-- values), but it is no longer assignable or selectable anywhere in the app.

