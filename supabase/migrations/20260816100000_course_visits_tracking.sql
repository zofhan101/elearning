-- Per-visit activity trace: which participant visited which module (a
-- courses-table row, per the UI terminology), when, and for roughly how
-- long. Name and country are looked up from personnel at report time —
-- not duplicated here.
--
-- Duration is approximated via a heartbeat: the client updates
-- last_active_at every ~20s while the page stays open and visible.
-- duration = last_active_at - entered_at. This is an approximation (a
-- closed tab stops sending heartbeats, so it slightly undercounts the
-- true time spent) rather than exact, but requires no fragile
-- page-unload handling.
CREATE TABLE public.course_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  entered_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_visits_user ON public.course_visits(user_id);
CREATE INDEX idx_course_visits_course ON public.course_visits(course_id);
CREATE INDEX idx_course_visits_entered ON public.course_visits(entered_at DESC);

ALTER TABLE public.course_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_visits_select ON public.course_visits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY course_visits_insert_own ON public.course_visits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY course_visits_update_own ON public.course_visits FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
