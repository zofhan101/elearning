-- Module validation certificates.
--
-- 1) Let an evaluation optionally target a specific module (nullable —
--    course-wide evaluations with no module_id remain unaffected). This is
--    what "Nom du module" on the certificate is drawn from, and what
--    determines which module gets marked validated on a passing attempt.
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

-- 2) Fix: evaluations.total_points was never kept in sync with its
-- questions' point values when added through the admin UI (it only had a
-- correct value where a migration set it manually, e.g. the Communicable
-- Disease quiz). This certificate feature needs an accurate total_points
-- to compute the 50% pass threshold, so keep it in sync going forward and
-- backfill any existing evaluations now.
CREATE OR REPLACE FUNCTION public.sync_evaluation_total_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eval_id uuid;
BEGIN
  v_eval_id := COALESCE(NEW.evaluation_id, OLD.evaluation_id);
  UPDATE public.evaluations
  SET total_points = COALESCE((SELECT SUM(points) FROM public.questions WHERE evaluation_id = v_eval_id), 0)
  WHERE id = v_eval_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS questions_sync_total_points ON public.questions;
CREATE TRIGGER questions_sync_total_points
AFTER INSERT OR UPDATE OF points OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.sync_evaluation_total_points();

UPDATE public.evaluations e
SET total_points = COALESCE((SELECT SUM(points) FROM public.questions q WHERE q.evaluation_id = e.id), 0);

-- 3) One certificate per (user, module). Written only by the
-- generate-module-certificate edge function (service role), so there is
-- no client-facing INSERT/UPDATE policy.
CREATE TABLE public.module_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
ALTER TABLE public.module_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY module_certificates_select ON public.module_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- 4) Private storage bucket for the generated PDFs (contains personal
-- data — name, country — so unlike course-files this is NOT public).
-- Paths are stored as "{user_id}/{module_id}.pdf" so RLS can check
-- ownership from the path itself.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY certificates_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid()))
  );
