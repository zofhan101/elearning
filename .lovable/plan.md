## Objectif
Regrouper les étudiants en cohortes (nommées + filtres auto par mention/parcours/niveau) et restreindre l'accès aux cours, modules et contenus à une cohorte cible.

## 1. Base de données (migration)

**Nouvelles tables**
- `cohorts` : `id`, `name`, `description`, `mention` (mention_type, nullable), `parcours` (parcours_type, nullable), `niveau` (niveau_etude, nullable), `created_by`. Quand mention/parcours/niveau sont renseignés → cohorte « dynamique » (membres calculés depuis `personnel`). Sinon (ou en complément) → cohorte « manuelle ».
- `cohort_members` : `cohort_id`, `user_id` (UNIQUE pair) pour les ajouts manuels.

**Colonnes de ciblage** (toutes nullables = visible à tous)
- `courses.cohort_id`, `modules.cohort_id`, `content_blocks.cohort_id`

**Fonctions SECURITY DEFINER**
- `is_in_cohort(_user_id, _cohort_id)` → vrai si l'utilisateur est membre manuel **ou** correspond aux filtres mention/parcours/niveau de la cohorte (lus depuis `personnel`).
- `can_view_course(_user_id, _course_id)` → staff OU `cohort_id IS NULL` OU `is_in_cohort(...)`.
- `can_view_module(_user_id, _module_id)` → staff OU module sans cohorte ET cours visible OU module cohort visible.
- `can_view_content(_user_id, _block_id)` → idem.

**RLS**
- Remplacer `*_select_all` (true) par `USING (is_staff(auth.uid()) OR can_view_*(...))` sur `courses`, `modules`, `content_blocks`. Les politiques staff_write restent.
- `cohorts` / `cohort_members` : SELECT staff + membres ; ALL staff.

## 2. Pages admin
- **`/admin/cohortes`** : liste, créer/éditer (nom, description, mention/parcours/niveau optionnels), gérer membres manuels (recherche d'étudiants via `personnel`+`profiles`, ajout/retrait).
- **`AdminCourses`** : ajout d'un sélecteur « Cohorte cible » (— Tous —, ou liste).
- **`AdminModules`** : sélecteur « Cohorte cible » par module (hérite du cours si vide).
- **`AdminContents`** : sélecteur « Cohorte cible » par bloc.
- Lien « Cohortes » dans le menu Administration.

## 3. Côté étudiant
Aucun changement front : la RLS filtre automatiquement les cours/modules/contenus non destinés à l'étudiant. Les paramètres cohorte ne sont pas exposés dans l'UI étudiant.

## Détails techniques
- `personnel` contient déjà mention/parcours/niveau → source unique pour le matching auto.
- Index sur `cohorts(mention, parcours, niveau)` et `cohort_members(user_id, cohort_id)`.
- Mise à jour `src/integrations/supabase/types.ts` automatique après migration.
- Composant `<CohortSelect>` réutilisable (Select shadcn) basé sur fetch `cohorts`.

## Hors périmètre
- Édition en lot de cohortes existantes via CSV.
- Notifications quand un étudiant rejoint/quitte une cohorte.
- Filtrage des évaluations par cohorte (peut être ajouté plus tard sur le même modèle).
