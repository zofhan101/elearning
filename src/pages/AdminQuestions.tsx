import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableList } from "@/components/SortableList";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";

type Kind = "mcq_single" | "mcq_multi" | "true_false" | "short";

interface Choice {
  id: string;
  label: string;
}

interface Question {
  id: string;
  evaluation_id: string;
  prompt: string;
  kind: Kind;
  choices: Choice[] | null;
  correct: string[] | null;
  points: number;
  position: number;
  time_limit_seconds: number | null;
}

const newChoiceId = () => Math.random().toString(36).slice(2, 8);

export default function AdminQuestions() {
  const { courseId, evalId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [evalTitle, setEvalTitle] = useState("");
  const [open, setOpen] = useState(false);
  const defaults: Partial<Question> = {
    prompt: "",
    kind: "mcq_single",
    choices: [{ id: newChoiceId(), label: "" }, { id: newChoiceId(), label: "" }],
    correct: [],
    points: 1,
    time_limit_seconds: null,
  };
  const [editing, setEditing] = useState<Partial<Question>>(defaults);

  const load = async () => {
    const [{ data: e }, { data: q }] = await Promise.all([
      supabase.from("evaluations").select("title").eq("id", evalId!).maybeSingle(),
      supabase.from("questions").select("*").eq("evaluation_id", evalId!).order("position"),
    ]);
    setEvalTitle((e as any)?.title ?? "");
    setQuestions((q as any) ?? []);
  };
  useEffect(() => { if (evalId) load(); }, [evalId]);

  const save = async () => {
    if (!editing.prompt?.trim()) return toast.error("Prompt required");
    const payload: any = {
      prompt: editing.prompt,
      kind: editing.kind,
      choices: editing.kind === "short" ? null : editing.choices,
      correct: editing.correct,
      points: editing.points ?? 1,
      time_limit_seconds: editing.time_limit_seconds && editing.time_limit_seconds > 0 ? editing.time_limit_seconds : null,
    };
    if (editing.id) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.evaluation_id = evalId;
      payload.position = questions.length;
      const { error } = await supabase.from("questions").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    setEditing(defaults);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const reorder = async (newOrder: Question[]) => {
    setQuestions(newOrder);
    await Promise.all(
      newOrder.map((q, idx) => supabase.from("questions").update({ position: idx }).eq("id", q.id))
    );
  };

  const choices: Choice[] = Array.isArray(editing.choices) ? editing.choices : [];
  const correct: string[] = Array.isArray(editing.correct) ? editing.correct : [];

  const updateChoice = (id: string, v: string) => {
    setEditing({ ...editing, choices: choices.map((c) => (c.id === id ? { ...c, label: v } : c)) });
  };
  const addChoice = () => setEditing({ ...editing, choices: [...choices, { id: newChoiceId(), label: "" }] });
  const removeChoice = (id: string) =>
    setEditing({
      ...editing,
      choices: choices.filter((c) => c.id !== id),
      correct: correct.filter((c) => c !== id),
    });
  const toggleCorrect = (id: string) => {
    if (editing.kind === "mcq_single" || editing.kind === "true_false") {
      setEditing({ ...editing, correct: [id] });
    } else {
      const has = correct.includes(id);
      setEditing({ ...editing, correct: has ? correct.filter((c) => c !== id) : [...correct, id] });
    }
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <Link to={`/admin/cours/${courseId}/evaluations`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-4 w-4" />Back to Assessments
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Questions</h1>
            <p className="text-muted-foreground text-sm">{evalTitle}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(defaults); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New Question</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Question" : "New Question"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Type</Label>
                    <Select
                      value={editing.kind}
                      onValueChange={(v: Kind) =>
                        setEditing({
                          ...editing,
                          kind: v,
                          correct: [],
                          choices:
                            v === "true_false"
                              ? [{ id: "true", label: "True" }, { id: "false", label: "False" }]
                              : v === "short"
                              ? null
                              : [{ id: newChoiceId(), label: "" }, { id: newChoiceId(), label: "" }],
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq_single">Single Choice</SelectItem>
                        <SelectItem value="mcq_multi">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True / False</SelectItem>
                        <SelectItem value="short">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Points</Label>
                    <Input type="number" value={editing.points ?? 1} onChange={(e) => setEditing({ ...editing, points: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Timer per question (seconds — optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={editing.time_limit_seconds ?? ""}
                    onChange={(e) => setEditing({ ...editing, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">If set, the question automatically advances to the next one after this delay.</p>
                </div>
                <div>
                  <Label>Prompt *</Label>
                  <RichTextEditor value={editing.prompt ?? ""} onChange={(v) => setEditing({ ...editing, prompt: v })} />
                </div>
                {editing.kind !== "short" && (
                  <div>
                    <Label>Choices</Label>
                    <div className="space-y-2 mt-1">
                      {choices.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <Checkbox checked={correct.includes(c.id)} onCheckedChange={() => toggleCorrect(c.id)} />
                          <Input value={c.label} onChange={(e) => updateChoice(c.id, e.target.value)} placeholder={`Choice ${i + 1}`} disabled={editing.kind === "true_false"} />
                          {editing.kind !== "true_false" && (
                            <Button variant="ghost" size="sm" onClick={() => removeChoice(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {editing.kind !== "true_false" && (
                        <Button variant="outline" size="sm" onClick={addChoice}>
                          <Plus className="h-4 w-4 mr-1" />Add a Choice
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {editing.kind === "short" && (
                  <div>
                    <Label>Expected Answer(s) (separated by |)</Label>
                    <Input
                      value={Array.isArray(editing.correct) ? editing.correct.join("|") : ""}
                      onChange={(e) => setEditing({ ...editing, correct: e.target.value.split("|").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SortableList
          items={questions}
          onReorder={reorder}
          renderItem={(q) => (
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{q.kind} · {q.points} pt</div>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: q.prompt }} />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(q); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(q.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
        {questions.length === 0 && (
          <div className="surface-card p-8 text-center text-muted-foreground mt-3">No questions.</div>
        )}
      </div>
    </AppLayout>
  );
}
