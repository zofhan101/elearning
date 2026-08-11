-- Add a manual display-order column to courses, so the admin can reorder
-- them (Course Management page) and that same order is reflected wherever
-- courses are listed for students (Dashboard, Explore).
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Backfill existing rows with a stable initial order based on creation
-- date, so reordering starts from a sensible baseline.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM public.courses
)
UPDATE public.courses c
SET position = ordered.rn
FROM ordered
WHERE c.id = ordered.id;
