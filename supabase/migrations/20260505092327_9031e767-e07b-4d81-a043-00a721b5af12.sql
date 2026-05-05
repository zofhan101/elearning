CREATE OR REPLACE FUNCTION public.enforce_max_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_a integer;
  used integer;
BEGIN
  SELECT max_attempts INTO max_a FROM public.evaluations WHERE id = NEW.evaluation_id;
  IF max_a IS NULL THEN max_a := 1; END IF;
  SELECT count(*) INTO used FROM public.attempts
    WHERE evaluation_id = NEW.evaluation_id
      AND user_id = NEW.user_id
      AND submitted_at IS NOT NULL;
  IF used >= max_a THEN
    RAISE EXCEPTION 'Nombre maximum de tentatives atteint (%).', max_a;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attempts_enforce_max ON public.attempts;
CREATE TRIGGER attempts_enforce_max
BEFORE INSERT ON public.attempts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_attempts();