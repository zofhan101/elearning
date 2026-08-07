-- Add a required "Lecturer" field to modules (now labeled "Course" in the UI).
-- Existing rows are backfilled with an empty string so the NOT NULL
-- constraint can be added without breaking current data; admins should
-- fill this in when next editing an older entry.
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS lecturer text NOT NULL DEFAULT '';
