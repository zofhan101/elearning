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

type Kind = "single" | "multiple" | "true_false" | "short_text";

interface Question {
  id: string;
  evaluation_id: string;
  prompt: string;
  kind: Kind;
  choices: any;
  correct: any;
  points: number;
  position: number;
  time_limit_seconds: number | null;
}

export default function AdminQuestions() {
  const { courseId, evalId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [evalTitle, setEvalTitle] = useState("");
  const [open, setOpen] = useState(false);
  const defaults: Partial<Question> = { prompt: "", kind: "single", choices: ["", ""], correct: [], points: 1, time_limit_seconds: null };
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
    if (!editing.prompt?.trim()) return toast.error("Énoncé requis");
    const payload: any = {
      prompt: editing.prompt,
      kind: editing.kind,
      choices: editing.kind === "short_text" ? null : editing.choices,
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
    toast.success("Enregistré");
    setOpen(false);
    setEditing(defaults);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette question ?")) return;
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

  const choices: string[] = Array.isArray(editing.choices) ? editing.choices : [];
  const correct: number[] = Array.isArray(editing.correct) ? editing.correct : [];

  const updateChoice = (i: number, v: string) => {
    const next = [...choices]; next[i] = v;
    setEditing({ ...editing, choices: next });
  };
  const addChoice = () => setEditing({ ...editing, choices: [...choices, ""] });
  const removeChoice = (i: number) => setEditing({ ...editing, choices: choices.filter((_, k) => k !== i), correct: correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)) });
  const toggleCorrect = (i: number) => {
    if (editing.kind === "single" || editing.kind === "true_false") {
      setEditing({ ...editing, correct: [i] });
    } else {
      const has = correct.includes(i);
      setEditing({ ...editing, correct: has ? correct.filter((c) => c !== i) : [...correct, i] });
    }
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <Link to={`/admin/cours/${courseId}/evaluations`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-4 w-4" />Retour aux évaluations
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Questions</h1>
            <p className="text-muted-foreground text-sm">{evalTitle}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(defaults); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Nouvelle question</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Type</Label>
                    <Select value={editing.kind} onValueChange={(v: Kind) => setEditing({ ...editing, kind: v, correct: [], choices: v === "true_false" ? ["Vrai", "Faux"] : v === "short_text" ? null : ["", ""] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Choix unique</SelectItem>
                        <SelectItem value="multiple">Choix multiples</SelectItem>
                        <SelectItem value="true_false">Vrai / Faux</SelectItem>
                        <SelectItem value="short_text">Réponse courte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Points</Label>
                    <Input type="number" value={editing.points ?? 1} onChange={(e) => setEditing({ ...editing, points: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Chronomètre par question (secondes — optionnel)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Aucune limite"
                    value={editing.time_limit_seconds ?? ""}
                    onChange={(e) => setEditing({ ...editing, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Si défini, la question passe automatiquement à la suivante après ce délai.</p>
                </div>
                <div>
                  <Label>Énoncé *</Label>
                  <RichTextEditor value={editing.prompt ?? ""} onChange={(v) => setEditing({ ...editing, prompt: v })} />
                </div>
                {editing.kind !== "short_text" && (
                  <div>
                    <Label>Choix</Label>
                    <div className="space-y-2 mt-1">
                      {choices.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox checked={correct.includes(i)} onCheckedChange={() => toggleCorrect(i)} />
                          <Input value={c} onChange={(e) => updateChoice(i, e.target.value)} placeholder={`Choix ${i + 1}`} disabled={editing.kind === "true_false"} />
                          {editing.kind !== "true_false" && (
                            <Button variant="ghost" size="sm" onClick={() => removeChoice(i)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {editing.kind !== "true_false" && (
                        <Button variant="outline" size="sm" onClick={addChoice}>
                          <Plus className="h-4 w-4 mr-1" />Ajouter un choix
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {editing.kind === "short_text" && (
                  <div>
                    <Label>Réponse(s) attendue(s) (séparées par |)</Label>
                    <Input
                      value={Array.isArray(editing.correct) ? editing.correct.join("|") : ""}
                      onChange={(e) => setEditing({ ...editing, correct: e.target.value.split("|").map((s) => s.trim()).filter(Boolean) })}
                    />
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
          <div className="surface-card p-8 text-center text-muted-foreground mt-3">Aucune question.</div>
        )}
      </div>
    </AppLayout>
  );
}
