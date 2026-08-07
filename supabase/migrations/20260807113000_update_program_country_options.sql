-- Update Program (mention_type) options to: Blended Learning, Summer School, Field Trip
ALTER TYPE public.mention_type ADD VALUE IF NOT EXISTS 'blended_learning';
ALTER TYPE public.mention_type ADD VALUE IF NOT EXISTS 'summer_school';
ALTER TYPE public.mention_type ADD VALUE IF NOT EXISTS 'field_trip';

-- Update Track -> Country (parcours_type) options to: Germany, Madagascar, Indonesia
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'germany';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'madagascar';
ALTER TYPE public.parcours_type ADD VALUE IF NOT EXISTS 'indonesia';

-- Note: the previous mention_type/parcours_type values (medecine_humaine, pharmacie,
-- tronc_commun, anesthesie, etc.) remain defined at the database level (Postgres does
-- not support dropping enum values) but are no longer offered or used anywhere in the app.
-- The "Level" (niveau_etude) field and column are also left in place at the database
-- level but are no longer shown or editable in the UI.
