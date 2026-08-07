-- Helper: can write (create folder, upload, delete) in a given audience
CREATE OR REPLACE FUNCTION public.can_write_audience(_user_id uuid, _audience share_audience)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR (
      _audience IN ('teachers','all')
      AND public.has_role(_user_id, 'instructor'::app_role)
    )
    OR (
      _audience IN ('staff_admin','all')
      AND public.has_role(_user_id, 'staff_admin'::app_role)
    )
$$;

-- ===== shared_folders =====
DROP POLICY IF EXISTS folders_select_audience ON public.shared_folders;
DROP POLICY IF EXISTS folders_insert_member ON public.shared_folders;
DROP POLICY IF EXISTS folders_update_owner_or_admin ON public.shared_folders;
DROP POLICY IF EXISTS folders_delete_owner_or_admin ON public.shared_folders;

CREATE POLICY folders_select_audience ON public.shared_folders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.in_audience(auth.uid(), audience));

CREATE POLICY folders_insert_writer ON public.shared_folders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (created_by = auth.uid() AND public.can_write_audience(auth.uid(), audience))
  );

CREATE POLICY folders_update_writer ON public.shared_folders
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (created_by = auth.uid() AND public.can_write_audience(auth.uid(), audience))
  );

CREATE POLICY folders_delete_writer ON public.shared_folders
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (created_by = auth.uid() AND public.can_write_audience(auth.uid(), audience))
  );

-- ===== shared_files =====
DROP POLICY IF EXISTS files_select_audience ON public.shared_files;
DROP POLICY IF EXISTS files_insert_member ON public.shared_files;
DROP POLICY IF EXISTS files_update_owner_or_admin ON public.shared_files;
DROP POLICY IF EXISTS files_delete_owner_or_admin ON public.shared_files;

CREATE POLICY files_select_audience ON public.shared_files
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.shared_folders f
      WHERE f.id = shared_files.folder_id
        AND public.in_audience(auth.uid(), f.audience)
    )
  );

CREATE POLICY files_insert_writer ON public.shared_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.shared_folders f
        WHERE f.id = shared_files.folder_id
          AND public.can_write_audience(auth.uid(), f.audience)
      )
    )
  );

CREATE POLICY files_update_writer ON public.shared_files
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (
        SELECT 1 FROM public.shared_folders f
        WHERE f.id = shared_files.folder_id
          AND public.can_write_audience(auth.uid(), f.audience)
      )
    )
  );

CREATE POLICY files_delete_writer ON public.shared_files
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (
        SELECT 1 FROM public.shared_folders f
        WHERE f.id = shared_files.folder_id
          AND public.can_write_audience(auth.uid(), f.audience)
      )
    )
  );