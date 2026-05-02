import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  Folder,
  FolderPlus,
  Upload,
  ChevronRight,
  Home,
  Trash2,
  Download,
  FileText,
  Users,
  GraduationCap,
  Briefcase,
  Globe,
  File as FileIcon,
  Share2,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Audience = "teachers" | "students" | "staff_admin" | "all";

interface SFolder {
  id: string;
  name: string;
  parent_id: string | null;
  audience: Audience;
  created_by: string | null;
  description: string | null;
}
interface SFile {
  id: string;
  folder_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
}

const audienceLabel: Record<Audience, string> = {
  teachers: "Enseignants",
  students: "Étudiants",
  staff_admin: "Personnel adm. & technique",
  all: "Tout le monde",
};
const audienceIcon: Record<Audience, any> = {
  teachers: GraduationCap,
  students: Users,
  staff_admin: Briefcase,
  all: Globe,
};

function formatSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

function DraggableFile({ file, canWrite, onDelete, onDownload, onShare }: { file: SFile; canWrite: boolean; onDelete: () => void; onDownload: () => void; onShare: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { fileId: file.id },
    disabled: !canWrite,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="surface-card p-3 flex items-center gap-3 hover:border-primary/40 transition-colors"
    >
      <button
        className={`text-muted-foreground ${canWrite ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-60"}`}
        {...(canWrite ? attributes : {})}
        {...(canWrite ? listeners : {})}
      >
        <FileIcon className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">{file.mime_type ?? "—"} · {formatSize(file.size_bytes)}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onDownload}><Download className="h-4 w-4" /></Button>
      {canWrite && (
        <Button variant="ghost" size="icon" onClick={onShare} title="Partager avec"><Share2 className="h-4 w-4" /></Button>
      )}
      {canWrite && (
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      )}
    </div>
  );
}

function DroppableFolder({ folder, canWrite, onOpen, onDelete, onShare }: { folder: SFolder; canWrite: boolean; onOpen: () => void; onDelete: () => void; onShare: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}`, data: { folderId: folder.id } });
  const Icon = audienceIcon[folder.audience];
  return (
    <div
      ref={setNodeRef}
      onClick={onOpen}
      className={`surface-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors ${isOver ? "border-primary bg-primary-soft" : ""}`}
    >
      <Folder className="h-5 w-5 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{folder.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" />{audienceLabel[folder.audience]}
        </div>
      </div>
      {canWrite && (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onShare(); }} title="Partager avec"><Share2 className="h-4 w-4" /></Button>
      )}
      {canWrite && (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      )}
    </div>
  );
}

export default function Echanges() {
  const { user, isAdmin, isInstructor, isStaffAdmin } = useAuth();
  const [currentFolder, setCurrentFolder] = useState<SFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<SFolder[]>([]);
  const [folders, setFolders] = useState<SFolder[]>([]);
  const [files, setFiles] = useState<SFile[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [newFolder, setNewFolder] = useState<{ name: string; audience: Audience }>({ name: "", audience: "all" });
  const [dragOverDrop, setDragOverDrop] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ kind: "file" | "folder"; item: SFile | SFolder } | null>(null);
  const [shareAudience, setShareAudience] = useState<Audience>("teachers");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    const fQuery = supabase.from("shared_folders").select("*").order("name");
    const { data: fs } = currentFolder
      ? await fQuery.eq("parent_id", currentFolder.id)
      : await fQuery.is("parent_id", null);
    setFolders((fs as any) ?? []);

    if (currentFolder) {
      const { data: files } = await supabase.from("shared_files").select("*").eq("folder_id", currentFolder.id).order("name");
      setFiles((files as any) ?? []);
    } else {
      setFiles([]);
    }
  }, [currentFolder]);

  useEffect(() => { load(); }, [load]);

  const openFolder = (f: SFolder) => {
    setBreadcrumbs([...breadcrumbs, f]);
    setCurrentFolder(f);
  };
  const goTo = (idx: number) => {
    if (idx < 0) {
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } else {
      const next = breadcrumbs.slice(0, idx + 1);
      setBreadcrumbs(next);
      setCurrentFolder(next[next.length - 1]);
    }
  };

  const createFolder = async () => {
    if (!newFolder.name.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("shared_folders").insert({
      name: newFolder.name.trim(),
      audience: newFolder.audience,
      parent_id: currentFolder?.id ?? null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Dossier créé");
    setOpenNew(false);
    setNewFolder({ name: "", audience: "all" });
    load();
  };

  const removeFolder = async (id: string) => {
    if (!confirm("Supprimer ce dossier et tout son contenu ?")) return;
    const { error } = await supabase.from("shared_folders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeFile = async (file: SFile) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    await supabase.storage.from("shared-files").remove([file.storage_path]);
    const { error } = await supabase.from("shared_files").delete().eq("id", file.id);
    if (error) return toast.error(error.message);
    load();
  };

  const download = async (file: SFile) => {
    const { data, error } = await supabase.storage.from("shared-files").createSignedUrl(file.storage_path, 3600);
    if (error || !data) return toast.error("Téléchargement impossible");
    window.open(data.signedUrl, "_blank");
  };

  const uploadFiles = async (filesList: FileList | File[]) => {
    if (!currentFolder) return toast.error("Ouvrez un dossier d'abord");
    if (!user) return;
    const arr = Array.from(filesList);
    for (const file of arr) {
      const path = `${currentFolder.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("shared-files").upload(path, file);
      if (upErr) { toast.error(`${file.name} : ${upErr.message}`); continue; }
      const { error: dbErr } = await supabase.from("shared_files").insert({
        folder_id: currentFolder.id,
        name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      });
      if (dbErr) toast.error(`${file.name} : ${dbErr.message}`);
    }
    toast.success("Fichiers téléversés");
    load();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const fileId = (active.data.current as any)?.fileId;
    const folderId = (over.data.current as any)?.folderId;
    if (!fileId || !folderId) return;
    const { error } = await supabase.from("shared_files").update({ folder_id: folderId }).eq("id", fileId);
    if (error) toast.error(error.message);
    else { toast.success("Fichier déplacé"); load(); }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOverDrop(true); };
  const onDragLeave = () => setDragOverDrop(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDrop(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const openShare = (kind: "file" | "folder", item: SFile | SFolder) => {
    if (kind === "folder") setShareAudience((item as SFolder).audience);
    else setShareAudience("teachers");
    setShareTarget({ kind, item });
  };

  const findOrCreateRootFolderForAudience = async (audience: Audience): Promise<string | null> => {
    if (!user) return null;
    const { data: existing } = await supabase
      .from("shared_folders")
      .select("*")
      .is("parent_id", null)
      .eq("audience", audience)
      .order("created_at", { ascending: true })
      .limit(1);
    if (existing && existing.length > 0) return (existing[0] as any).id;
    const defaultName: Record<Audience, string> = {
      teachers: "Espace Enseignants",
      students: "Espace Étudiants",
      staff_admin: "Espace Personnel adm. & technique",
      all: "Espace partagé",
    };
    const { data: created, error } = await supabase
      .from("shared_folders")
      .insert({ name: defaultName[audience], audience, parent_id: null, created_by: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    return (created as any).id;
  };

  const confirmShare = async () => {
    if (!shareTarget) return;
    if (shareTarget.kind === "folder") {
      const folder = shareTarget.item as SFolder;
      const { error } = await supabase
        .from("shared_folders")
        .update({ audience: shareAudience })
        .eq("id", folder.id);
      if (error) return toast.error(error.message);
      toast.success(`Dossier partagé avec : ${audienceLabel[shareAudience]}`);
    } else {
      const file = shareTarget.item as SFile;
      const targetFolderId = await findOrCreateRootFolderForAudience(shareAudience);
      if (!targetFolderId) return;
      const { error } = await supabase
        .from("shared_files")
        .update({ folder_id: targetFolderId })
        .eq("id", file.id);
      if (error) return toast.error(error.message);
      toast.success(`Fichier partagé avec : ${audienceLabel[shareAudience]}`);
    }
    setShareTarget(null);
    load();
  };

  // Permissions matrix (échanges croisés activés)
  // - Admin : tout
  // - Enseignant : écriture sur toutes les audiences (teachers, students, staff_admin, all)
  // - PAT (staff_admin) : écriture sur toutes les audiences
  // - Étudiant : lecture + download uniquement
  const canWriteAudience = (a: Audience) => {
    if (isAdmin) return true;
    if (isInstructor || isStaffAdmin) return true;
    return false;
  };
  const canWriteCurrentFolder = currentFolder ? canWriteAudience(currentFolder.audience) : false;
  const allAudiences: Audience[] = ["all", "teachers", "students", "staff_admin"];
  const creatableAudiences: Audience[] = isAdmin || isInstructor || isStaffAdmin ? allAudiences : [];
  const canCreateFolder = creatableAudiences.length > 0;

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Espace d'échanges</h1>
            <p className="text-muted-foreground text-sm">Partagez des documents entre enseignants, étudiants et personnel administratif.</p>
          </div>
          <div className="flex gap-2">
            {canCreateFolder && (
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild>
                  <Button variant="outline"><FolderPlus className="h-4 w-4 mr-1" />Nouveau dossier</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouveau dossier</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nom</Label>
                      <Input value={newFolder.name} onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Visible par</Label>
                      <Select value={newFolder.audience} onValueChange={(v: Audience) => setNewFolder({ ...newFolder, audience: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {creatableAudiences.includes("all") && <SelectItem value="all">Tout le monde</SelectItem>}
                          {creatableAudiences.includes("teachers") && <SelectItem value="teachers">Enseignants</SelectItem>}
                          {creatableAudiences.includes("students") && <SelectItem value="students">Étudiants</SelectItem>}
                          {creatableAudiences.includes("staff_admin") && <SelectItem value="staff_admin">Personnel administratif & technique</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenNew(false)}>Annuler</Button>
                    <Button onClick={createFolder}>Créer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {currentFolder && canWriteCurrentFolder && (
              <>
                <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />Téléverser
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
          <button onClick={() => goTo(-1)} className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-4 w-4" />Racine
          </button>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button onClick={() => goTo(i)} className="hover:text-primary truncate max-w-[200px]">{b.name}</button>
            </span>
          ))}
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-2 md:grid-cols-2">
            {folders.map((f) => (
              <DroppableFolder key={f.id} folder={f} canWrite={canWriteAudience(f.audience)} onOpen={() => openFolder(f)} onDelete={() => removeFolder(f.id)} onShare={() => openShare("folder", f)} />
            ))}
          </div>

          {currentFolder && (
            <div
              onDragOver={canWriteCurrentFolder ? onDragOver : undefined}
              onDragLeave={canWriteCurrentFolder ? onDragLeave : undefined}
              onDrop={canWriteCurrentFolder ? onDrop : undefined}
              className={`mt-6 rounded-xl border-2 ${canWriteCurrentFolder ? "border-dashed" : "border-solid"} p-4 transition-colors ${dragOverDrop ? "border-primary bg-primary-soft" : "border-border"}`}
            >
              {canWriteCurrentFolder ? (
                <div className="text-xs text-muted-foreground mb-3 text-center">
                  Glissez-déposez vos fichiers ici pour les téléverser
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mb-3 text-center">
                  Lecture seule — vous pouvez télécharger les fichiers de ce dossier.
                </div>
              )}
              <div className="grid gap-2">
                {files.map((f) => (
                  <DraggableFile key={f.id} file={f} canWrite={canWriteCurrentFolder} onDelete={() => removeFile(f)} onDownload={() => download(f)} onShare={() => openShare("file", f)} />
                ))}
                {files.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">Aucun fichier dans ce dossier.</div>
                )}
              </div>
            </div>
          )}
          {!currentFolder && folders.length === 0 && (
            <div className="surface-card p-8 text-center text-muted-foreground">
              Aucun dossier. {canCreateFolder && "Créez-en un pour commencer."}
            </div>
          )}
        </DndContext>

        <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Partager {shareTarget?.kind === "folder" ? "le dossier" : "le fichier"} « {shareTarget?.item.name} »
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Choisissez le groupe destinataire</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["teachers", "students", "staff_admin", "all"] as Audience[]).map((a) => {
                  const Icon = audienceIcon[a];
                  const selected = shareAudience === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setShareAudience(a)}
                      className={`surface-card p-3 flex items-center gap-2 text-left transition-colors ${selected ? "border-primary bg-primary-soft" : "hover:border-primary/40"}`}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm">{audienceLabel[a]}</span>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                {shareTarget?.kind === "folder"
                  ? "Le dossier deviendra visible et modifiable selon les droits du groupe sélectionné."
                  : "Le fichier sera déplacé vers le dossier racine de ce groupe (créé automatiquement si nécessaire)."}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareTarget(null)}>Annuler</Button>
              <Button onClick={confirmShare}>Partager</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
