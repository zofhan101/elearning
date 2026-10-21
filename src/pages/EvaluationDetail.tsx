import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, User, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requestCertificate } from "@/lib/certificate";
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
  const [certState, setCertState] = useState<"idle" | "checking" | "ready" | "error">("idle");
  const [certMessage, setCertMessage] = useState<string | null>(null);
  const certTriggered = useRef(false);

  const bestAttempt = history.reduce<any | null>((best, h) => {
    if (!(h.max_score > 0)) return best;
    const pct = h.score / h.max_score;
    return !best || pct > best.score / best.max_score ? h : best;
  }, null);
  const bestPct = bestAttempt ? Math.round((bestAttempt.score / bestAttempt.max_score) * 100) : 0;
  const certEligible = !!ev?.counts_toward_certificate && bestPct >= 80;

  const runCertificate = async () => {
    if (!bestAttempt) return;
    setCertState("checking");
    setCertMessage(null);
    const res = await requestCertificate(bestAttempt.id);
    if (res.issued) {
      setCertState("ready");
      if (!res.alreadyExisted) {
        toast.success("🎉 Module validated — your certificate is now available in My Profile.");
      }
    } else {
      setCertState("error");
      setCertMessage(res.message ?? "No certificate was issued.");
    }
  };

  // A qualifying result (>= 80%) on an assessment that counts toward the
  // module certificate: make sure the certificate exists. Idempotent, so it
  // is safe on every visit and recovers any earlier failed generation.
  useEffect(() => {
    if (!certEligible || certTriggered.current) return;
    certTriggered.current = true;
    void runCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certEligible, bestAttempt?.id]);

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
  const hasFinalized = history.some((h) => h.finalized);
  const blocked = hasPerfectScore || hasFinalized || (submitted && ev.single_attempt) || (!unlimited && attemptsCount >= maxAttempts);

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
                : hasFinalized
                ? "Assessment finalized — this assessment is now complete."
                : "You have already submitted this questionnaire"}
              {!hasPerfectScore && !hasFinalized && previousAttempt.score !== null && ` — score: ${previousAttempt.score}/${previousAttempt.max_score}`}
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

        {certEligible && certState !== "idle" && (
          <div className="mt-4 text-sm">
            {certState === "checking" && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your module certificate…
              </p>
            )}
            {certState === "ready" && (
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" /> Your module certificate is available in My Profile → My Certificates.
              </p>
            )}
            {certState === "error" && (
              <div>
                <p className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {certMessage}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={runCertificate}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <section className="surface-card p-6 mt-8">
            <h2 className="font-semibold mb-3">Attempt History</h2>
            <div className="divide-y divide-border">
              {history.map((h, i) => {
                const hPct = h.max_score > 0 ? Math.round((h.score / h.max_score) * 100) : 0;
                return (
                  <div key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Attempt {history.length - i} — {new Date(h.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-medium tabular-nums">
                        {h.score}/{h.max_score} ({hPct}%)
                      </span>
                      <Link to={`/resultat/${h.id}`} className="text-primary hover:underline">
                        View results
                      </Link>
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
