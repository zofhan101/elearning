-- Keep real access permissions (user_roles) in sync whenever an admin
-- changes a member's roster Role (personnel.member_role) for an ALREADY
-- linked account — fixing the gap where editing the Role label after
-- account creation had no effect on actual permissions (the mapping
-- previously only ran once, at account-creation time).
CREATE OR REPLACE FUNCTION public.sync_role_on_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role public.app_role;
BEGIN
  -- Only meaningful for personnel rows already linked to a real login
  -- account (confirmed via a matching profiles row) — placeholder-only
  -- entries have no user_roles to sync yet.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.member_role = 'admin' THEN
    resolved_role := 'admin';
  ELSIF NEW.member_role IN ('enseignant', 'pat') THEN
    resolved_role := 'instructor';
  ELSIF NEW.member_role = 'etudiant' THEN
    resolved_role := 'student';
  ELSE
    RETURN NEW; -- member_role cleared or unrecognized: leave existing access untouched
  END IF;

  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, resolved_role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personnel_sync_role ON public.personnel;
CREATE TRIGGER personnel_sync_role
AFTER UPDATE OF member_role ON public.personnel
FOR EACH ROW
WHEN (NEW.member_role IS DISTINCT FROM OLD.member_role)
EXECUTE FUNCTION public.sync_role_on_member_role_change();
