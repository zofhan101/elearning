import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Trophy, PartyPopper, Award, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestCertificate } from "@/lib/certificate";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

type CertState = "idle" | "checking" | "ready" | "error";

export default function QuizResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [ev, setEv] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [certState, setCertState] = useState<CertState>("idle");
  const [certMessage, setCertMessage] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const certTriggered = useRef(false);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("attempts").select("*").eq("id", attemptId).maybeSingle();
      setAttempt(a);
      if (!a) return;
      const { data: e } = await supabase.from("evaluations").select("*").eq("id", a.evaluation_id).maybeSingle();
      setEv(e);
      const { data: ans } = await supabase.from("answers").select("*").eq("attempt_id", attemptId);
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("evaluation_id", a.evaluation_id)
        .order("position");
      const merged = (qs ?? []).map((q: any) => ({
        q,
        answer: (ans ?? []).find((x: any) => x.question_id === q.id),
      }));
      setItems(merged);
    })();
  }, [attemptId]);

  // Ask the backend to issue the certificate as soon as a qualifying result
  // is displayed. The call is idempotent, so it is safe on every visit and
  // it recovers any case where the automatic call at submission failed.
  useEffect(() => {
    if (!attempt || !ev || certTriggered.current) return;
    const percent = attempt.max_score ? Math.round((attempt.score / attempt.max_score) * 100) : 0;
    if (percent < 80 || !ev.counts_toward_certificate) return;
    certTriggered.current = true;
    void runCertificate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ev]);

  /** Returns true when a certificate exists after the call. */
  const runCertificate = async (announce: boolean): Promise<boolean> => {
    if (!attempt) return false;
    setCertState("checking");
    setCertMessage(null);
    const res = await requestCertificate(attempt.id);
    if (res.issued) {
      setCertState("ready");
      if (!res.alreadyExisted || announce) {
        toast.success("🎉 Module validated — your certificate is now available in My Profile.");
      }
      return true;
    }
    setCertState("error");
    setCertMessage(res.message ?? "No certificate was issued.");
    toast.error(res.message ?? "No certificate was issued.");
    return false;
  };

  if (!attempt || !ev) return null;
  const pct = attempt.max_score ? Math.round((attempt.score / attempt.max_score) * 100) : 0;
  const isPerfect = pct === 100;
  const isCertUnlocked = pct >= 80 && !!ev.counts_toward_certificate;
  const showAnswerKey = pct >= 80;

  const finalize = async () => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      const { error } = await supabase.from("attempts").update({ finalized: true } as any).eq("id", attempt.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      // Make sure the certificate exists before leaving this page. If it
      // could not be issued, stay here so the reason stays visible and the
      // participant can retry (the assessment itself is already finalized).
      if (certState !== "ready") {
        const ok = await runCertificate(false);
        if (!ok) return;
      }
      navigate(`/cours/${ev.course_id}/evaluations`);
    } finally {
      setFinalizing(false);
    }
  };

  const certStatus = (
    <>
      {certState === "checking" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating your certificate…
        </p>
      )}
      {certState === "ready" && (
        <p className="flex items-center gap-2 text-sm text-success mt-3">
          <CheckCircle2 className="h-4 w-4" /> Your certificate is ready in My Profile → My Certificates.
        </p>
      )}
      {certState === "error" && (
        <div className="mt-3 text-sm">
          <p className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {certMessage}
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => runCertificate(false)}>
            Retry
          </Button>
        </div>
      )}
    </>
  );

  return (
    <AppLayout>
      <div className="container max-w-3xl py-10">
        <div className="surface-card p-8 text-center">
          <div className="inline-flex h-16 w-16 rounded-full gradient-hero items-center justify-center mb-4 shadow-elevated">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Questionnaire Submitted</h1>
          <p className="text-muted-foreground mt-1">{ev.title}</p>
          <div className="mt-6 text-5xl font-bold text-primary tabular-nums">
            {attempt.score}
            <span className="text-2xl text-muted-foreground">/{attempt.max_score}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {pct}%{showAnswerKey ? " — answer key below" : ""}
          </div>

          {isCertUnlocked && (
            <div className="mt-6 surface-card bg-primary-soft p-5 text-left">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {isPerfect ? <Award className="h-6 w-6 text-primary" /> : <PartyPopper className="h-6 w-6 text-primary" />}
                </div>
                <div>
                  {isPerfect ? (
                    <>
                      <p className="font-medium text-foreground">Perfect score — 100%!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have reached a score of 100%. Your module validation certificate is now unlocked and
                        available for download in your Profile. This assessment is now complete — no further
                        attempts are needed.
                      </p>
                      {certStatus}
                      <Button className="mt-4" onClick={() => navigate(`/cours/${ev.course_id}/evaluations`)}>
                        Back to Assessments
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">You've reached a score of 80%!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your module validation certificate is now unlocked and available for download in your
                        Profile. Would you like to keep attempting this assessment, or finalize it here?
                      </p>
                      {certStatus}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" disabled={finalizing} onClick={() => navigate(`/evaluation/${ev.id}`)}>
                          Continue Attempting
                        </Button>
                        <Button onClick={finalize} disabled={finalizing}>
                          {finalizing ? "Finalizing…" : "Finalize Assessment"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isCertUnlocked && (
            <Button asChild variant="outline" className="mt-6">
              <Link to={`/cours/${ev.course_id}/evaluations`}>Back to Assessments</Link>
            </Button>
          )}
        </div>

        {showAnswerKey ? (
          <>
            <h2 className="text-lg font-semibold mt-10 mb-4">Detailed Answer Key</h2>
            <div className="space-y-3">
              {items.map(({ q, answer }, i) => {
                const correct = (answer?.awarded_points ?? 0) > 0;
                const auto = q.kind !== "long";
                return (
                  <div key={q.id} className="surface-card p-5">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {auto ? (
                          correct ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" title="Manual grading" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {i + 1}. {q.prompt}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Your answer: <span className="text-foreground">{formatAns(q, answer?.response)}</span>
                        </div>
                        {q.correct && (
                          <div className="text-sm text-success mt-1">
                            Accepted answer: {formatCorrect(q)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm font-semibold tabular-nums">
                        {answer?.awarded_points ?? 0}/{q.points}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground mt-10">
            The answer key unlocks once you reach a score of 80% on this assessment.
          </p>
        )}
      </div>
    </AppLayout>
  );
}

function formatAns(q: any, r: any) {
  if (r === null || r === undefined || r === "") return "—";
  if (q.kind === "mcq_single" || q.kind === "true_false") {
    return q.choices?.find((c: any) => c.id === r)?.label ?? r;
  }
  if (q.kind === "mcq_multi") {
    return (r as string[]).map((id) => q.choices?.find((c: any) => c.id === id)?.label ?? id).join(", ");
  }
  return String(r);
}
function formatCorrect(q: any) {
  if (q.kind === "mcq_single" || q.kind === "true_false") {
    return q.correct.map((id: string) => q.choices?.find((c: any) => c.id === id)?.label ?? id).join(", ");
  }
  if (q.kind === "mcq_multi") {
    return q.correct.map((id: string) => q.choices?.find((c: any) => c.id === id)?.label ?? id).join(", ");
  }
  return q.correct.join(" · ");
}
