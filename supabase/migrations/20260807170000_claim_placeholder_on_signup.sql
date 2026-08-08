-- When a member is pre-created (via "New Member", the cohort quick-add
-- form, or CSV import) before they have a real login, their personnel row
-- gets a random placeholder id (see 20260807160000). This migration makes
-- account creation "claim" that placeholder instead of creating a
-- duplicate row, by matching on institutional email — and sets the real
-- app permission role (user_roles) based on the roster Role chosen for
-- that placeholder, instead of always defaulting to student.

CREATE OR REPLACE FUNCTION public.handle_new_user_personnel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.personnel
  WHERE id <> NEW.id
    AND email_institutionnel IS NOT NULL
    AND lower(email_institutionnel) = lower(NEW.email)
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.personnel SET id = NEW.id WHERE id = existing_id;
    UPDATE public.cohort_members SET user_id = NEW.id WHERE user_id = existing_id;
  ELSE
    INSERT INTO public.personnel (id, email_institutionnel, nom)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  placeholder_role public.member_role_type;
  resolved_role public.app_role := 'student';
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT member_role INTO placeholder_role
  FROM public.personnel
  WHERE id <> NEW.id
    AND email_institutionnel IS NOT NULL
    AND lower(email_institutionnel) = lower(NEW.email)
  LIMIT 1;

  IF placeholder_role = 'admin' THEN
    resolved_role := 'admin';
  ELSIF placeholder_role IN ('enseignant', 'pat') THEN
    resolved_role := 'instructor';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, resolved_role);
  RETURN NEW;
END; $$;
