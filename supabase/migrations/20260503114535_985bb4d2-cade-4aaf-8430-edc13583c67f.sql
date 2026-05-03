-- Enums référentiel scolarité
CREATE TYPE public.mention_type AS ENUM (
  'medecine_humaine',
  'pharmacie',
  'medecine_veterinaire',
  'sciences_paramedicales'
);

CREATE TYPE public.parcours_type AS ENUM (
  'anesthesie',
  'maieutique',
  'infirmier_generaliste',
  'massokinesitherapie',
  'ergotherapie',
  'technique_appareillage',
  'technique_laboratoire',
  'electroradiologie'
);

CREATE TYPE public.niveau_etude AS ENUM (
  'L1','L2','L3','A4','A5','A6','A7','A8'
);

-- Table référentiel personnel
CREATE TABLE public.personnel (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matricule text UNIQUE,
  nom text,
  prenom text,
  date_naissance date,
  adresse text,
  pere text,
  mere text,
  email_personnel text,
  email_institutionnel text UNIQUE,
  mention public.mention_type,
  parcours public.parcours_type,
  niveau public.niveau_etude,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER personnel_touch_updated_at
BEFORE UPDATE ON public.personnel
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-création d'une ligne personnel à chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user_personnel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.personnel (id, email_institutionnel, nom)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_personnel
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_personnel();

-- Backfill pour les utilisateurs déjà existants
INSERT INTO public.personnel (id, email_institutionnel, nom)
SELECT u.id, u.email, COALESCE(p.full_name, u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY personnel_select_self_or_staff
ON public.personnel FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff_admin'::app_role)
);

CREATE POLICY personnel_update_self_or_admin
ON public.personnel FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY personnel_insert_admin
ON public.personnel FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY personnel_delete_admin
ON public.personnel FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index utiles pour les futures extensions
CREATE INDEX idx_personnel_mention ON public.personnel(mention);
CREATE INDEX idx_personnel_parcours ON public.personnel(parcours);
CREATE INDEX idx_personnel_niveau ON public.personnel(niveau);
CREATE INDEX idx_personnel_matricule ON public.personnel(matricule);