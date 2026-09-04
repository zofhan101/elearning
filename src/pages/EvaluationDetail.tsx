import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EvaluationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ev, setEv] = useState<any>(null);
  const [questionsCount, setQ] = useState(0);
  const [previousAttempt, setPrev] = useState<any>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: e } = await supabase.from("evaluations").select("*").eq("id", id).maybeSingle();
      setEv(e);
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("evaluation_id", id);
      setQ(count ?? 0);
      const { data: a } = await supabase
        .from("attempts")
        .select("*")
        .eq("evaluation_id", id)
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false });
      setPrev(a?.[0] ?? null);
      setAttemptsCount((a ?? []).filter((x: any) => x.submitted_at).length);
      setHistory((a ?? []).filter((x: any) => x.submitted_at));
    })();
  }, [id, user]);

  const start = async () => {
    const max = ev.max_attempts ?? 1;
    if (max !== 0 && attemptsCount >= max) {
      toast.error(`Maximum number of attempts reached (${max}).`);
      return;
    }
    const { data, error } = await supabase
      .from("attempts")
      .insert({ evaluation_id: id, user_id: user!.id, max_score: ev.total_points })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/quiz/${data.id}`);
  };

  if (!ev) return null;
  const submitted = previousAttempt?.submitted_at;
  const maxAttempts = ev.max_attempts ?? 1;
  const unlimited = maxAttempts === 0;
  const hasPerfectScore = history.some((h) => h.max_score > 0 && h.score === h.max_score);
  const blocked = hasPerfectScore || (submitted && ev.single_attempt) || (!unlimited && attemptsCount >= maxAttempts);

  return (
    <AppLayout>
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <Link to={`/cours/${ev.course_id}/evaluations`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Assessments
          </Link>
        </div>
      </div>
      <div className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-semibold">{ev.title}</h1>
        <p className="text-muted-foreground mt-1">Online with the questionnaire tool</p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Pill icon={<User className="h-3.5 w-3.5" />}>{ev.mode === "individual" ? "Individual" : "Group"}</Pill>
          {ev.scheduled_at && (
            <Pill>
              {new Date(ev.scheduled_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })} —{" "}
              {new Date(ev.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </Pill>
          )}
          <Pill icon={<Clock className="h-3.5 w-3.5" />}>Timer: {ev.duration_minutes} minutes</Pill>
        </div>

        <section className="surface-card p-6 mt-8">
          <h2 className="font-semibold">Description</h2>
          <p className="text-sm text-muted-foreground mt-2">{ev.description}</p>
        </section>

        <section className="surface-card p-6 mt-4">
          <h2 className="font-semibold">Questionnaire</h2>
          <p className="text-sm text-muted-foreground mt-1">{questionsCount} question{questionsCount > 1 ? "s" : ""}</p>
        </section>

        <section className="surface-card p-6 mt-4 space-y-3">
          <h2 className="font-semibold">Schedule</h2>
          <Row strong={`${ev.duration_minutes} minutes to answer`} sub="This questionnaire is timed." />
          {ev.single_attempt && (
            <Row strong="One attempt only" sub="Once this questionnaire is submitted, it will no longer be possible to answer it again." />
          )}
          <Row strong={`Attempts allowed: ${unlimited ? "Unlimited" : maxAttempts}`} sub={`You have used ${attemptsCount} attempt${attemptsCount > 1 ? "s" : ""}.`} />
          <Row strong="Additional Information" sub="No documents allowed." />
        </section>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {blocked ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-5 w-5" />
              {hasPerfectScore
                ? "Perfect score achieved — this assessment is now complete."
                : "You have already submitted this questionnaire"}
              {!hasPerfectScore && previousAttempt.score !== null && ` — score: ${previousAttempt.score}/${previousAttempt.max_score}`}
            </div>
          ) : (
            <>
              <Button size="lg" onClick={start} className="shadow-elevated">
                {previousAttempt && !submitted ? "Resume Questionnaire" : "Try Questionnaire"}
              </Button>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" /> The timer starts as soon as the attempt begins.
              </span>
            </>
          )}
        </div>

        {history.length > 0 && (
          <section className="surface-card p-6 mt-8">
            <h2 className="font-semibold mb-3">Attempt History</h2>
            <div className="divide-y divide-border">
              {history.map((h, i) => {
                const hPct = h.max_score > 0 ? Math.round((h.score / h.max_score) * 100) : 0;
                return (
                  <div key={h.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Attempt {history.length - i} — {new Date(h.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <span className="font-medium tabular-nums">
                      {h.score}/{h.max_score} ({hPct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function Pill({ children, icon }: any) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-medium">
      {icon}
      {children}
    </span>
  );
}
function Row({ strong, sub }: any) {
  return (
    <div>
      <div className="font-medium text-sm">{strong}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
