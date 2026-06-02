DO $$ BEGIN
  CREATE TYPE public.sexe_type AS ENUM ('M', 'F');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS sexe public.sexe_type;
ALTER TABLE public.personnel ALTER COLUMN id SET DEFAULT gen_random_uuid();