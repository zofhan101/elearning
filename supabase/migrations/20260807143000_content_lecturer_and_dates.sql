-- Content blocks: add optional Start Date / End Date, replacing the
-- per-content cohort targeting field (redundant now that the parent
-- course already handles cohort targeting, and modules were already
-- simplified the same way).
ALTER TABLE public.content_blocks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.content_blocks ADD COLUMN IF NOT EXISTS end_date date;

-- Reset any existing per-content cohort restriction so nothing is left
-- unreachable now that the field is removed from the creation form.
UPDATE public.content_blocks SET cohort_id = NULL WHERE cohort_id IS NOT NULL;

-- Note: the content_blocks.cohort_id column and its RLS check are left in
-- place (unused going forward) rather than dropped, consistent with how
-- other deprecated fields were handled in this project. The existing
-- "section" column is also kept as-is at the database level; it is now
-- used to store the Lecturer's name instead of a section label.
