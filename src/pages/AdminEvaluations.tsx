import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";

interface Eval {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  single_attempt: boolean;
  mode: "individual" | "group";
  scheduled_at: string | null;
  max_attempts: number;
}

export default function AdminEvaluations() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [evals, setEvals] = useState<Eval[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const defaults: Partial<Eval> = { title: "", description: "", duration_minutes: 30, single_attempt: true, mode: "individual", max_attempts: 1 };
  const [editing, setEditing] = useState<Partial<Eval>>(defaults);

  const load = async () => {
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", courseId!).maybeSingle(),
      supabase.from("evaluations").select("*").eq("course_id", courseId!).order("created_at", { ascending: false }),
    ]);
    setCourse(c);
    setEvals((e as any) ?? []);
  };
  useEffect(() => { if (courseId) load(); }, [courseId]);

  const save = async () => {
    if (!editing.title?.trim()) return toast.error("Title required");
    const payload: any = {
      title: editing.title,
      description: editing.description || null,
      duration_minutes: editing.duration_minutes ?? 30,
      single_attempt: !!editing.single_attempt,
      mode: editing.mode ?? "individual",
      max_attempts: Math.max(1, editing.max_attempts ?? 1),
    };
    if (editing.id) {
      const { error } = await supabase.from("evaluations").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.course_id = courseId;
      const { error } = await supabase.from("evaluations").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    setEditing(defaults);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this assessment?")) return;
    const { error } = await supabase.from("evaluations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <Link to="/admin/cours" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-4 w-4" />Back to Courses
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Assessments</h1>
            <p className="text-muted-foreground text-sm">{course?.title}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(defaults); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New Assessment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit" : "New Assessment"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <RichTextEditor value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" value={editing.duration_minutes ?? 30} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <Select value={editing.mode} onValueChange={(v: any) => setEditing({ ...editing, mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Single Attempt</Label>
                    <Select value={editing.single_attempt ? "yes" : "no"} onValueChange={(v) => setEditing({ ...editing, single_attempt: v === "yes" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Maximum Number of Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.max_attempts ?? 1}
                    onChange={(e) => setEditing({ ...editing, max_attempts: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Strict limit enforced server-side — the student cannot modify it.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {evals.map((e) => (
            <div key={e.id} className="surface-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.duration_minutes} min · {e.mode}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/cours/${courseId}/evaluations/${e.id}/questions`)}>
                <ListChecks className="h-4 w-4 mr-1" />Questions
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditing(e); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {evals.length === 0 && (
            <div className="surface-card p-8 text-center text-muted-foreground">No assessments.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
