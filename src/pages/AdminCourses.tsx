import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, FolderOpen, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { CohortMultiSelect } from "@/components/CohortMultiSelect";

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  instructor_name: string | null;
  group_label: string | null;
  start_date: string | null;
  end_date: string | null;
  is_open: boolean;
  cover_color: string | null;
  cohortIds: string[];
}

const empty: Partial<Course> = {
  title: "",
  subtitle: "",
  instructor_name: "",
  group_label: "",
  start_date: "",
  end_date: "",
  is_open: false,
  cover_color: "blue",
  cohortIds: [],
};

export default function AdminCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohortNames, setCohortNames] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Course>>(empty);

  const load = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses(((data as any) ?? []).map((c: any) => ({ ...c, cohortIds: [] })));

    const { data: links } = await supabase
      .from("course_cohorts")
      .select("course_id, cohorts(name)");
    const map: Record<string, string[]> = {};
    (links ?? []).forEach((l: any) => {
      if (!map[l.course_id]) map[l.course_id] = [];
      if (l.cohorts?.name) map[l.course_id].push(l.cohorts.name);
    });
    setCohortNames(map);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (c: Course) => {
    const { data } = await supabase.from("course_cohorts").select("cohort_id").eq("course_id", c.id);
    setEditing({ ...c, cohortIds: (data ?? []).map((r: any) => r.cohort_id) });
    setOpen(true);
  };

  const save = async () => {
    if (!editing.title?.trim()) return toast.error("Title required");
    const payload: any = {
      title: editing.title,
      subtitle: editing.subtitle || null,
      instructor_name: editing.instructor_name || null,
      group_label: editing.group_label || null,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      is_open: !!editing.is_open,
      cover_color: editing.cover_color || "blue",
    };
    let courseId = editing.id;
    if (courseId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", courseId);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
      if (error || !data) return toast.error(error?.message ?? "Error");
      courseId = data.id;
    }

    // Sync course_cohorts join table
    await supabase.from("course_cohorts").delete().eq("course_id", courseId);
    const cohortIds = editing.cohortIds ?? [];
    if (cohortIds.length > 0) {
      const { error: linkErr } = await supabase
        .from("course_cohorts")
        .insert(cohortIds.map((cohort_id) => ({ course_id: courseId, cohort_id })));
      if (linkErr) return toast.error(linkErr.message);
    }

    toast.success(editing.id ? "Course updated" : "Course created");
    setOpen(false);
    setEditing(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Course deleted");
    load();
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Course Management</h1>
            <p className="text-muted-foreground text-sm">Create, edit, and organize your courses.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" />New Module</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Module" : "New Module"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Subtitle</Label>
                  <Textarea value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={editing.start_date ?? ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={editing.end_date ?? ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
                </div>
                <div>
                  <Label>Color (key)</Label>
                  <Input value={editing.cover_color ?? ""} onChange={(e) => setEditing({ ...editing, cover_color: e.target.value })} placeholder="blue, teal, amber…" />
                </div>
                <div className="flex items-end gap-3">
                  <Switch checked={!!editing.is_open} onCheckedChange={(v) => setEditing({ ...editing, is_open: v })} />
                  <Label>Course open to students</Label>
                </div>
                <div className="col-span-2">
                  <Label>Target Cohorts</Label>
                  <CohortMultiSelect
                    value={editing.cohortIds ?? []}
                    onChange={(v) => setEditing({ ...editing, cohortIds: v })}
                  />
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
          {courses.map((c) => (
            <div key={c.id} className="surface-card p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="font-medium">{c.title}</div>
                {c.subtitle && <div className="text-sm text-muted-foreground">{c.subtitle}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {c.instructor_name ?? "—"} · {c.group_label ?? "—"} · {c.is_open ? "Open" : "Closed"}
                </div>
                {cohortNames[c.id]?.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Cohorts: {cohortNames[c.id].join(", ")}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/cours/${c.id}/modules`)}>
                  <FolderOpen className="h-4 w-4 mr-1" />Modules
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/cours/${c.id}/evaluations`)}>
                  <ListChecks className="h-4 w-4 mr-1" />Assessments
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="surface-card p-8 text-center text-muted-foreground">No courses yet.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
