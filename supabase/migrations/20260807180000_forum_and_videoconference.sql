-- Add two new content types: an internal discussion forum, and an
-- embedded video conference room (Jitsi Meet), both scoped per content
-- block and therefore per course (and per cohort, if the block/module/
-- course targeting applies).
ALTER TYPE public.content_kind ADD VALUE IF NOT EXISTS 'forum';
ALTER TYPE public.content_kind ADD VALUE IF NOT EXISTS 'videoconference';

-- Reusable visibility check for a single content block, mirroring the
-- existing content_select RLS policy's logic, so new features (like the
-- forum below) can reuse it instead of duplicating the join.
CREATE OR REPLACE FUNCTION public.can_view_content_block(_user_id uuid, _block_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_staff(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.content_blocks cb
      JOIN public.modules m ON m.id = cb.module_id
      WHERE cb.id = _block_id
        AND (cb.cohort_id IS NULL OR public.is_in_cohort(_user_id, cb.cohort_id))
        AND (m.cohort_id IS NULL OR public.is_in_cohort(_user_id, m.cohort_id))
        AND public.can_view_course(_user_id, m.course_id)
    )
$$;

-- Forum threads and replies. author_name is captured at post time (from
-- the poster's own personnel record, which they can always read about
-- themselves) rather than looked up later, since the personnel table's
-- RLS intentionally restricts reading OTHER users' records to admins only
-- — this avoids needing to loosen that privacy boundary for the forum.
CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_threads_block ON public.forum_threads(content_block_id);

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_replies_thread ON public.forum_replies(thread_id);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY forum_threads_select ON public.forum_threads FOR SELECT TO authenticated
  USING (public.can_view_content_block(auth.uid(), content_block_id));

CREATE POLICY forum_threads_insert ON public.forum_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_view_content_block(auth.uid(), content_block_id));

CREATE POLICY forum_threads_delete ON public.forum_threads FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY forum_replies_select ON public.forum_replies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND public.can_view_content_block(auth.uid(), t.content_block_id)
    )
  );

CREATE POLICY forum_replies_insert ON public.forum_replies FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND public.can_view_content_block(auth.uid(), t.content_block_id)
    )
  );

CREATE POLICY forum_replies_delete ON public.forum_replies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()));
