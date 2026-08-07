## Objective
Group students into cohorts (named + auto filters by program/track/level) and restrict access to courses, modules, and content to a target cohort.

## 1. Database (migration)

**New tables**
- `cohorts`: `id`, `name`, `description`, `mention` (mention_type, nullable), `parcours` (parcours_type, nullable), `niveau` (niveau_etude, nullable), `created_by`. When mention/parcours/niveau are set → "dynamic" cohort (members computed from `personnel`). Otherwise (or in addition) → "manual" cohort.
- `cohort_members`: `cohort_id`, `user_id` (UNIQUE pair) for manual additions.

**Targeting columns** (all nullable = visible to everyone)
- `courses.cohort_id`, `modules.cohort_id`, `content_blocks.cohort_id`

**SECURITY DEFINER functions**
- `is_in_cohort(_user_id, _cohort_id)` → true if the user is a manual member **or** matches the cohort's mention/parcours/niveau filters (read from `personnel`).
- `can_view_course(_user_id, _course_id)` → staff OR `cohort_id IS NULL` OR `is_in_cohort(...)`.
- `can_view_module(_user_id, _module_id)` → staff OR module without a cohort AND course visible OR module cohort visible.
- `can_view_content(_user_id, _block_id)` → same logic.

**RLS**
- Replace `*_select_all` (true) with `USING (is_staff(auth.uid()) OR can_view_*(...))` on `courses`, `modules`, `content_blocks`. The staff_write policies remain.
- `cohorts` / `cohort_members`: SELECT staff + members; ALL staff.

## 2. Admin pages
- **`/admin/cohortes`**: list, create/edit (name, description, optional mention/parcours/niveau), manage manual members (search students via `personnel`+`profiles`, add/remove).
- **`AdminCourses`**: add a "Target Cohort" selector (— All —, or list).
- **`AdminModules`**: "Target Cohort" selector per module (inherits from the course if empty).
- **`AdminContents`**: "Target Cohort" selector per block.
- "Cohorts" link in the Administration menu.

## 3. Student side
No frontend changes needed: RLS automatically filters out courses/modules/content not intended for the student. Cohort settings are not exposed in the student UI.

## Technical details
- `personnel` already contains mention/parcours/niveau → single source for auto-matching.
- Index on `cohorts(mention, parcours, niveau)` and `cohort_members(user_id, cohort_id)`.
- `src/integrations/supabase/types.ts` updated automatically after migration.
- Reusable `<CohortSelect>` component (shadcn Select) based on a `cohorts` fetch.

## Out of scope
- Bulk editing of existing cohorts via CSV.
- Notifications when a student joins/leaves a cohort.
- Filtering assessments by cohort (can be added later using the same model).
