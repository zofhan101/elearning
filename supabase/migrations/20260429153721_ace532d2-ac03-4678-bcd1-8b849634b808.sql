
ALTER TABLE public.signup_requests DROP COLUMN password_hash;
DROP FUNCTION IF EXISTS public.is_email_approved(text);
