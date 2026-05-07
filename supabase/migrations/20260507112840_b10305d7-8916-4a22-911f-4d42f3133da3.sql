ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'tronc_commun';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'medecine_humaine';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'medecine_veterinaire';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'pharmacie';

COMMENT ON TYPE public.parcours_type IS 'Parcours étudiants : paramédicaux + médecine/pharmacie/vétérinaire/tronc commun';