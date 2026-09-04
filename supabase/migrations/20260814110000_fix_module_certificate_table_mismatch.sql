-- Fix a fundamental mismatch: evaluations.module_id (added for the
-- certificate feature) pointed at the "modules" table — but due to the
-- earlier Course/Module terminology swap in the UI, what the interface
-- calls "Module" (the Course Management page, "New Module" button) is
-- actually backed by the "courses" table, and what the UI calls "Course"
-- is backed by "modules". So module_id was pointing one level too deep.
--
-- The fix is simpler than the original design: every evaluation already
-- identifies its UI-"Module" directly via its own course_id — no separate
-- link was ever needed. Replace the module_id FK with a plain opt-in
-- flag, and key certificate grouping off course_id directly.

-- 1) Add the opt-in flag, preserving intent from any evaluation that had
--    module_id set (it was clearly meant to count toward a certificate).
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS counts_toward_certificate boolean NOT NULL DEFAULT false;
UPDATE public.evaluations SET counts_toward_certificate = true WHERE module_id IS NOT NULL;
ALTER TABLE public.evaluations DROP COLUMN IF EXISTS module_id;

-- 2) Any certificates already issued reference the wrong table's id and
--    cannot be reinterpreted safely — clear them so they regenerate
--    correctly (pointing at the right course) the next time a linked
--    assessment is submitted. The stored PDFs in the "certificates"
--    bucket are simply orphaned, not referenced by anything anymore.
DELETE FROM public.module_certificates;

-- 3) module_certificates.module_id now stores a courses.id (the
--    UI-"Module") — repoint its foreign key at the correct table. Column
--    name is kept as module_id to match the UI term "Module".
ALTER TABLE public.module_certificates DROP CONSTRAINT IF EXISTS module_certificates_module_id_fkey;
ALTER TABLE public.module_certificates
  ADD CONSTRAINT module_certificates_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.courses(id) ON DELETE CASCADE;
