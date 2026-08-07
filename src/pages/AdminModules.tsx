import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SortableList } from "@/components/SortableList";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";

interface Module {
  id: string;
  title: string;
  lecturer: string;
  description: string | null;
  position: number;
  start_date: string | null;
  end_date: string | null;
}

export default function AdminModules() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Module>>({ title: "", lecturer: "", description: "" });

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", courseId!).maybeSingle(),
      supabase.from("modules").select("*").eq("course_id", courseId!).order("position"),
    ]);
    setCourse(c);
    setModules((m as any) ?? []);
  };
  useEffect(() => { if (courseId) load(); }, [courseId]);

  const save = async () => {
    if (!editing.title?.trim()) return toast.error("Title required");
    if (!editing.lecturer?.trim()) return toast.error("Lecturer required");
    const payload: any = {
      title: editing.title,
      lecturer: editing.lecturer,
      description: editing.description || null,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("modules").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.course_id = courseId;
      payload.position = modules.length;
      const { error } = await supabase.from("modules").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    setEditing({ title: "", lecturer: "", description: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this module?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const reorder = async (newOrder: Module[]) => {
    setModules(newOrder);
    await Promise.all(
      newOrder.map((m, idx) => supabase.from("modules").update({ position: idx }).eq("id", m.id))
    );
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <Link to="/admin/cours" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-4 w-4" />Back to Courses
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Modules</h1>
            <p className="text-muted-foreground text-sm">{course?.title}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing({ title: "", lecturer: "", description: "" }); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New Course</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Course" : "New Course"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label>Lecturer *</Label>
                  <Input value={editing.lecturer ?? ""} onChange={(e) => setEditing({ ...editing, lecturer: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <RichTextEditor value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={editing.start_date ?? ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={editing.end_date ?? ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SortableList
          items={modules}
          onReorder={reorder}
          renderItem={(m) => (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {m.lecturer}
                  {m.start_date && <> · Start: {m.start_date}</>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/cours/${courseId}/modules/${m.id}/contenus`)}>
                <FileText className="h-4 w-4 mr-1" />Content
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
        {modules.length === 0 && (
          <div className="surface-card p-8 text-center text-muted-foreground mt-3">
            No modules. Drag and drop to reorder after creation.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
