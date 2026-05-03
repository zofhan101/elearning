INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "course_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-files');

CREATE POLICY "course_files_staff_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files' AND public.is_staff(auth.uid()));

CREATE POLICY "course_files_staff_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-files' AND public.is_staff(auth.uid()));

CREATE POLICY "course_files_staff_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-files' AND public.is_staff(auth.uid()));