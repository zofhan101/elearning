CREATE TYPE public.member_role_type AS ENUM ('enseignant','pat','etudiant');
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS member_role public.member_role_type;