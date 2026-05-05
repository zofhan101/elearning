ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS time_limit_seconds integer;