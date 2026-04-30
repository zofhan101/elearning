## Objectif

Transformer Brio (Faculté de Médecine Antananarivo) en véritable LMS éditable :
- Espace admin complet pour gérer cours, modules, blocs de contenu, évaluations & questions
- Réorganisation par drag & drop partout où l'ordre compte
- Éditeur riche Tiptap pour les contenus textuels
- Nouveau module « Espace d'échanges » : file manager partagé entre groupes Enseignants / Étudiants / Personnel administratif et technique

Permissions : admins + enseignants peuvent éditer (rôle `instructor` / `admin`). Le PAT (personnel admin & technique) sera un nouveau rôle utilisateur.

---

## 1. Base de données (migration)

### Nouveau rôle
- Ajouter `'staff_admin'` à l'enum `app_role` (= Personnel Administratif & Technique).
- Étendre `is_staff()` si nécessaire (PAT ne doit PAS pouvoir éditer les cours, mais accède au file manager).

### File manager / Espace d'échanges
- Nouvelle table `shared_folders` : nom, description, créée par, audience (`teachers` | `students` | `staff_admin` | `all`), parent_folder_id (arborescence).
- Nouvelle table `shared_files` : folder_id, nom, storage_path, mime, taille, uploadé par.
- Bucket Storage privé `shared-files` + policies par audience via `has_role()`.
- RLS : lecture si l'utilisateur appartient à l'audience ; écriture si admin OU si l'audience inclut son rôle (paramétrable).

### Ordres drag & drop
- Champs `position` déjà présents sur `modules`, `content_blocks`, `questions` ✅. Pas de migration structurelle nécessaire.

---

## 2. Espace d'administration (`/admin/*`)

Pages séparées dédiées au staff :

- `/admin/cours` — liste + créer / éditer / supprimer un cours (formulaire complet : titre, sous-titre, dates, ouverture, enseignant, couleur, groupe).
- `/admin/cours/:id/modules` — liste des modules du cours, drag & drop pour réordonner, ajouter/éditer/supprimer.
- `/admin/cours/:id/modules/:moduleId/contenus` — blocs de contenu (texte, vidéo, lien, fichier), drag & drop, éditeur Tiptap pour le texte.
- `/admin/cours/:id/evaluations` — créer/éditer évaluations.
- `/admin/cours/:id/evaluations/:evalId/questions` — questions, drag & drop, choix multiples éditables.
- `/admin/inscriptions` — déjà existant, conservé.
- `/admin/echanges` — file manager partagé (dossiers + fichiers, upload, suppression, navigation par dossier).

Accès :
- Cours/modules/contenus/évals : admins + enseignants.
- Inscriptions : admins seulement.
- Échanges : tous les rôles connectés (lecture filtrée par audience), upload selon permissions du dossier.

---

## 3. Drag & drop

Bibliothèque : `@dnd-kit/core` + `@dnd-kit/sortable` (légère, accessible, déjà compatible React 18).

Composant générique réutilisable `<SortableList>` qui :
- accepte un tableau ordonné par `position`
- au drop, recalcule les positions et fait un `UPDATE` batch via Supabase

Utilisé pour : modules, blocs de contenu, questions, dossiers.

---

## 4. Éditeur riche

`@tiptap/react` + extensions starter-kit, link, image, placeholder.
Composant `<RichTextEditor value onChange />` réutilisé dans :
- Description de cours / module / évaluation
- Bloc de contenu de type « texte »
- Énoncé de question

Stockage en HTML dans les colonnes `body` / `description` / `prompt` existantes. Sanitization via DOMPurify à l'affichage côté étudiant.

---

## 5. Espace d'échanges (file manager)

UI type explorateur :
- Colonne gauche : audiences/dossiers racines (Enseignants, Étudiants, PAT, Commun).
- Vue principale : liste/grille de dossiers + fichiers, breadcrumb, bouton « Nouveau dossier », « Téléverser ».
- Drag & drop pour :
  - réorganiser les fichiers à l'écran
  - **uploader** des fichiers (drop zone)
  - déplacer un fichier vers un autre dossier (drag d'une ligne vers un dossier)
- Aperçu basique (taille, type, date), téléchargement signé via Storage.

---

## 6. Navigation

Mettre à jour `AppLayout` :
- Lien « Administration » (menu déroulant) visible si `isStaff` → Cours, Inscriptions (admin), Échanges.
- Lien « Échanges » visible pour tout utilisateur connecté.

---

## Détails techniques

- Dépendances à ajouter : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `dompurify`, `@types/dompurify`.
- Validation Zod sur tous les formulaires.
- Toasts sonner pour feedback.
- Reorder = `UPDATE` batch dans une transaction RPC ou plusieurs upserts ; on commencera par upserts simples.
- Sanitization HTML obligatoire avant `dangerouslySetInnerHTML`.
- Bucket `shared-files` privé avec URLs signées (1h).

---

## Livrables de cette itération

1. Migration : enum `staff_admin`, tables `shared_folders` / `shared_files`, bucket + RLS.
2. Composants partagés : `<SortableList>`, `<RichTextEditor>`, `<SafeHtml>`.
3. Pages admin : cours, modules, contenus, évaluations, questions.
4. Page `/admin/echanges` (file manager avec drag & drop d'upload + déplacement).
5. Mise à jour navigation `AppLayout`.

---

## Hors périmètre (à confirmer plus tard)

- Édition inline directe sur les pages étudiant
- Versioning des contenus
- Commentaires / discussions sur les fichiers
- Aperçu PDF/image dans le file manager
- Notifications