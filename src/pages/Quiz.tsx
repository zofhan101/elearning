import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Eye, EyeOff, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Q {
  id: string;
  kind: string;
  prompt: string;
  points: number;
  choices: any[] | null;
  correct: any[] | null;
  position: number;
}

export default function Quiz() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [ev, setEv] = useState<any>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [showTimer, setShowTimer] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) return;
      if (a.submitted_at) {
        navigate(`/resultat/${a.id}`);
        return;
      }
      setAttempt(a);
      const { data: e } = await supabase.from("evaluations").select("*").eq("id", a.evaluation_id).maybeSingle();
      setEv(e);
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("evaluation_id", a.evaluation_id)
        .order("position");
      setQuestions((qs as any) ?? []);
    })();
  }, [attemptId, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => {
    if (!attempt || !ev) return 0;
    const end = new Date(attempt.started_at).getTime() + ev.duration_minutes * 60_000;
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [attempt, ev, now]);

  useEffect(() => {
    if (attempt && ev && remaining === 0 && !submitting) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${ss}`;
  };

  const totalPoints = questions.reduce((a, q) => a + q.points, 0);

  const submit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    let score = 0;
    const rows: any[] = [];
    for (const q of questions) {
      const r = responses[q.id];
      let awarded = 0;
      if (q.kind === "mcq_single" || q.kind === "true_false") {
        if (r && q.correct?.includes(r)) awarded = q.points;
      } else if (q.kind === "mcq_multi") {
        const set = new Set<string>(r ?? []);
        const correct = new Set<string>(q.correct ?? []);
        if (set.size === correct.size && [...set].every((x) => correct.has(x))) awarded = q.points;
      } else if (q.kind === "short") {
        const ans = String(r ?? "").trim().toLowerCase();
        if (ans && q.correct?.some((c: string) => c.toLowerCase() === ans)) awarded = q.points;
      }
      score += awarded;
      rows.push({ attempt_id: attemptId, question_id: q.id, response: r ?? null, awarded_points: awarded });
    }
    await supabase.from("answers").insert(rows);
    await supabase
      .from("attempts")
      .update({ submitted_at: new Date().toISOString(), score, max_score: totalPoints })
      .eq("id", attemptId!);
    if (auto) toast.info("Temps écoulé — questionnaire soumis automatiquement.");
    navigate(`/resultat/${attemptId}`);
  };

  if (!attempt || !ev) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Évaluation</div>
            <h1 className="font-semibold truncate">{ev.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">/{totalPoints}</span> points
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-mono text-lg tabular-nums ${remaining < 60 ? "text-destructive" : "text-foreground"}`}>
                {showTimer ? fmt(remaining) : "—:—:—"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowTimer((s) => !s)}>
                {showTimer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => submit(false)} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              Soumettre
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-5">
        {questions.map((q, i) => (
          <div key={q.id} className="surface-card p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-primary tabular-nums">{i + 1}</span>
                <p className="font-medium leading-relaxed">{q.prompt}</p>
              </div>
              <span className="shrink-0 ml-3 text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">
                {q.points} pt{q.points > 1 ? "s" : ""}
              </span>
            </div>

            <div className="ml-9 mt-4">
              <QuestionInput q={q} value={responses[q.id]} onChange={(v) => setResponses({ ...responses, [q.id]: v })} />
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          Soumettre le questionnaire vous permet de vérifier le mode de publication des résultats et de consulter le corrigé.
        </div>
        <div className="flex justify-end">
          <Button size="lg" onClick={() => submit(false)} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" /> Soumettre le questionnaire
          </Button>
        </div>
      </main>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: Q; value: any; onChange: (v: any) => void }) {
  if (q.kind === "mcq_single" || q.kind === "true_false") {
    return (
      <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2">
        {(q.choices ?? []).map((c) => (
          <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value={c.id} id={`${q.id}-${c.id}`} />
            <span className="text-sm">{c.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }
  if (q.kind === "mcq_multi") {
    const set = new Set<string>(value ?? []);
    return (
      <div className="space-y-2">
        {(q.choices ?? []).map((c) => (
          <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
            <Checkbox
              checked={set.has(c.id)}
              onCheckedChange={(checked) => {
                const next = new Set(set);
                if (checked) next.add(c.id);
                else next.delete(c.id);
                onChange([...next]);
              }}
            />
            <span className="text-sm">{c.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.kind === "short") {
    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Votre réponse…"
      />
    );
  }
  // long
  const wc = String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={5} placeholder="Rédigez votre réponse…" />
      <div className="text-xs text-muted-foreground mt-1">Nombre de mots : {wc}</div>
    </div>
  );
}
