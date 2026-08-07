-- Rename the training provider shown across the app from "Centre Pédagogia"
-- to "SDG Project".

-- 1) Update the default so newly created courses use the new name.
ALTER TABLE public.courses ALTER COLUMN offered_by SET DEFAULT 'SDG Project';

-- 2) Update existing courses that still hold the old default value.
-- (Courses where an admin already set a custom offered_by value are left
-- untouched.)
UPDATE public.courses SET offered_by = 'SDG Project' WHERE offered_by = 'Centre Pédagogia';
