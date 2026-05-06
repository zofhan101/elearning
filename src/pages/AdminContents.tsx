import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SortableList } from "@/components/SortableList";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SafeHtml } from "@/components/SafeHtml";
import { CohortSelect } from "@/components/CohortSelect";
import { toast } from "sonner";

type Kind = "text" | "video" | "link" | "file";

interface Block {
  id: string;
  module_id: string;
  title: string;
  kind: Kind;
  body: string | null;
  url: string | null;
  section: string | null;
  position: number;
}

export default function AdminContents() {
  const { courseId, moduleId } = useParams();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [moduleTitle, setModuleTitle] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Block>>({ title: "", kind: "text", body: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${moduleId}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from("course-files").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("course-files").getPublicUrl(path);
      setEditing((prev) => ({
        ...prev,
        url: data.publicUrl,
        title: prev.title?.trim() ? prev.title : file.name,
      }));
      toast.success("Fichier téléversé");
    } catch (err: any) {
      toast.error(err.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from("modules").select("title").eq("id", moduleId!).maybeSingle(),
      supabase.from("content_blocks").select("*").eq("module_id", moduleId!).order("position"),
    ]);
    setModuleTitle((m as any)?.title ?? "");
    setBlocks((b as any) ?? []);
  };
  useEffect(() => { if (moduleId) load(); }, [moduleId]);

  const save = async () => {
    if (!editing.title?.trim()) return toast.error("Titre requis");
    const payload: any = {
      title: editing.title,
      kind: editing.kind,
      body: editing.body || null,
      url: editing.url || null,
      section: editing.section || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("content_blocks").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.module_id = moduleId;
      payload.position = blocks.length;
      const { error } = await supabase.from("content_blocks").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Enregistré");
    setOpen(false);
    setEditing({ title: "", kind: "text", body: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    const { error } = await supabase.from("content_blocks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const reorder = async (newOrder: Block[]) => {
    setBlocks(newOrder);
    await Promise.all(
      newOrder.map((b, idx) => supabase.from("content_blocks").update({ position: idx }).eq("id", b.id))
    );
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <Link to={`/admin/cours/${courseId}/modules`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-4 w-4" />Retour aux modules
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Contenus</h1>
            <p className="text-muted-foreground text-sm">{moduleTitle}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ title: "", kind: "text", body: "" }); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Nouveau contenu</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Modifier le contenu" : "Nouveau contenu"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Titre *</Label>
                    <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={editing.kind} onValueChange={(v: Kind) => setEditing({ ...editing, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texte enrichi</SelectItem>
                        <SelectItem value="video">Vidéo (URL)</SelectItem>
                        <SelectItem value="link">Lien externe</SelectItem>
                        <SelectItem value="file">Fichier (URL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Section (optionnel)</Label>
                  <Input value={editing.section ?? ""} onChange={(e) => setEditing({ ...editing, section: e.target.value })} />
                </div>
                {editing.kind === "text" ? (
                  <div>
                    <Label>Contenu</Label>
                    <RichTextEditor value={editing.body ?? ""} onChange={(v) => setEditing({ ...editing, body: v })} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editing.url ?? ""}
                        onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                        placeholder="https://…"
                      />
                      {editing.kind === "file" && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={onFilePicked}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploading ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</>
                            ) : (
                              <><Upload className="h-4 w-4 mr-2" />Parcourir…</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    {editing.kind === "file" && (
                      <p className="text-xs text-muted-foreground">
                        Choisissez un fichier sur votre ordinateur ou collez une URL existante.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SortableList
          items={blocks}
          onReorder={reorder}
          renderItem={(b) => (
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.kind}</div>
                <div className="font-medium">{b.title}</div>
                {b.kind === "text" && b.body && (
                  <div className="mt-1 text-sm"><SafeHtml html={b.body} /></div>
                )}
                {b.url && <div className="text-xs text-primary truncate">{b.url}</div>}
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(b); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
        {blocks.length === 0 && (
          <div className="surface-card p-8 text-center text-muted-foreground mt-3">
            Aucun contenu. Ajoutez du texte, une vidéo, un lien ou un fichier.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
