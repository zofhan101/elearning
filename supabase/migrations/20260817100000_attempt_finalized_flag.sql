-- Lets a participant explicitly finalize an assessment once they've
-- reached 80% (choosing "Finalize Assessment" instead of "Continue
-- Attempting"). A finalized attempt should behave like a 100% score:
-- no further attempts are offered afterward.
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS finalized boolean NOT NULL DEFAULT false;
