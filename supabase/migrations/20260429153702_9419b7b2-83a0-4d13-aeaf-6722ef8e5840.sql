
-- Status enum
CREATE TYPE public.signup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  motivation text,
  status public.signup_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) can submit a signup request
CREATE POLICY "anyone_can_request_signup"
  ON public.signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only admins can view requests
CREATE POLICY "admin_select_requests"
  ON public.signup_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update (approve/reject) requests
CREATE POLICY "admin_update_requests"
  ON public.signup_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete requests
CREATE POLICY "admin_delete_requests"
  ON public.signup_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper function: check if an email has an approved signup request
CREATE OR REPLACE FUNCTION public.is_email_approved(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.signup_requests
    WHERE lower(email) = lower(_email) AND status = 'approved'
  )
$$;
