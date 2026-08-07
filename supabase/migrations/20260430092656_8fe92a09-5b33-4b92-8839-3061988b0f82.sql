-- Enum d'audience
DO $$ BEGIN
  CREATE TYPE public.share_audience AS ENUM ('teachers', 'students', 'staff_admin', 'all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: belongs to the audience?
CREATE OR REPLACE FUNCTION public.in_audience(_user_id uuid, _audience share_audience)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _audience = 'all'
    OR (_audience = 'teachers' AND (public.has_role(_user_id, 'instructor'::app_role) OR public.has_role(_user_id, 'admin'::app_role)))
    OR (_audience = 'students' AND public.has_role(_user_id, 'student'::app_role))
    OR (_audience = 'staff_admin' AND (public.has_role(_user_id, 'staff_admin'::app_role) OR public.has_role(_user_id, 'admin'::app_role)))
$$;

-- Dossiers
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  audience share_audience NOT NULL DEFAULT 'all',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_folders_parent ON public.shared_folders(parent_id);

ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_select_audience" ON public.shared_folders
  FOR SELECT TO authenticated
  USING (public.in_audience(auth.uid(), audience) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "folders_insert_member" ON public.shared_folders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (created_by = auth.uid() AND public.in_audience(auth.uid(), audience))
  );

CREATE POLICY "folders_update_owner_or_admin" ON public.shared_folders
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "folders_delete_owner_or_admin" ON public.shared_folders
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Fichiers
CREATE TABLE IF NOT EXISTS public.shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_files_folder ON public.shared_files(folder_id);

ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_select_audience" ON public.shared_files
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.shared_folders f
      WHERE f.id = shared_files.folder_id
        AND public.in_audience(auth.uid(), f.audience)
    )
  );

CREATE POLICY "files_insert_member" ON public.shared_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.shared_folders f
        WHERE f.id = shared_files.folder_id
          AND public.in_audience(auth.uid(), f.audience)
      )
    )
  );

CREATE POLICY "files_update_owner_or_admin" ON public.shared_files
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "files_delete_owner_or_admin" ON public.shared_files
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-files', 'shared-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "shared_files_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'shared-files');

CREATE POLICY "shared_files_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shared-files');

CREATE POLICY "shared_files_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shared-files' AND (
      owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );