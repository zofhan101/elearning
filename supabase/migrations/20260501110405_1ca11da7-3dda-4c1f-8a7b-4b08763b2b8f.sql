CREATE OR REPLACE FUNCTION public.can_write_audience(_user_id uuid, _audience share_audience)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR (
      _audience IN ('teachers','students','staff_admin','all')
      AND public.has_role(_user_id, 'instructor'::app_role)
    )
    OR (
      _audience IN ('teachers','students','staff_admin','all')
      AND public.has_role(_user_id, 'staff_admin'::app_role)
    )
$function$;