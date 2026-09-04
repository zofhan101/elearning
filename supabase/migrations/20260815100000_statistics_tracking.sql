-- Statistics system: lightweight activity tracking to power an admin
-- analytics dashboard (demographic breakdown, content engagement, login
-- frequency). Demographic stats need no new tables (personnel/cohorts
-- already have what's needed) — this migration only adds the two new
-- tracking tables.

-- One row per (user, calendar day), incremented on each app load while
-- authenticated. Naturally deduplicates by day, and makes "daily active
-- users" trivial to query.
CREATE TABLE public.login_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  visits integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY login_events_select ON public.login_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY login_events_upsert_own ON public.login_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY login_events_update_own ON public.login_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- One row per content view event (not deduplicated — repeat views are a
-- meaningful engagement signal, e.g. rewatching a video).
CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_block_id uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_views_block ON public.content_views(content_block_id);
CREATE INDEX idx_content_views_user ON public.content_views(user_id);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_views_select ON public.content_views FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY content_views_insert_own ON public.content_views FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_content_block(auth.uid(), content_block_id));

-- Atomic upsert-with-increment for today's login event, called once per
-- app load. A plain client-side upsert can't express "increment on
-- conflict", so this is done server-side to avoid race conditions.
CREATE OR REPLACE FUNCTION public.record_login_event()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.login_events (user_id, day, visits, first_seen_at, last_seen_at)
  VALUES (auth.uid(), current_date, 1, now(), now())
  ON CONFLICT (user_id, day)
  DO UPDATE SET visits = login_events.visits + 1, last_seen_at = now();
END;
$$;
