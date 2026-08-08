-- Fix: personnel.id already had DEFAULT gen_random_uuid() (added in an
-- earlier migration, intended to allow standalone roster entries that
-- aren't tied to a real login account), but it was still constrained by a
-- foreign key requiring it to match an existing auth.users row. This made
-- every such insert fail with:
--   "insert or update on table personnel violates foreign key constraint
--    personnel_id_fkey"
-- Dropping the constraint lets standalone personnel records be created
-- (e.g. via "Create and Add a New Member" or CSV import) while leaving
-- accounts created through the normal signup trigger (which sets
-- personnel.id = the real auth user's id) completely unaffected.
-- Trade-off: deleting a user from Authentication > Users will no longer
-- automatically delete their personnel row (the ON DELETE CASCADE went
-- away with the constraint).
ALTER TABLE public.personnel DROP CONSTRAINT IF EXISTS personnel_id_fkey;

-- Add "Admin" as a selectable member role. Note this is a roster/directory
-- label only (personnel.member_role) — it does not by itself grant actual
-- admin permissions in the app. Real permissions are controlled separately
-- via the user_roles table.
ALTER TYPE public.member_role_type ADD VALUE IF NOT EXISTS 'admin';
