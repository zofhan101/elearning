ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'tronc_commun';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'medecine_humaine';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'medecine_veterinaire';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'pharmacie';

COMMENT ON TYPE public.parcours_type IS 'Student tracks: paramedical + medicine/pharmacy/veterinary/common core';