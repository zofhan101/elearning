import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Clock, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function CourseEvaluations() {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const [evals, setEvals] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("evaluations")
      .select("*")
      .eq("course_id", id)
      .order("scheduled_at")
      .then(({ data }) => setEvals(data ?? []));
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Évaluations</h1>
        {isStaff && (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Ajouter une évaluation
          </Button>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
          <div className="col-span-6">Titre</div>
          <div className="col-span-2">Mode de travail</div>
          <div className="col-span-4">Déroulement</div>
        </div>
        {evals.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune évaluation pour le moment.</div>
        )}
        {evals.map((e) => (
          <Link
            key={e.id}
            to={`/evaluation/${e.id}`}
            className="grid grid-cols-12 px-5 py-4 hover:bg-muted/40 transition-colors items-center border-b border-border last:border-b-0"
          >
            <div className="col-span-6">
              <div className="font-medium text-foreground">{e.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Questionnaire en ligne — {e.total_points} points
              </div>
            </div>
            <div className="col-span-2 text-sm flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" /> {e.mode === "individual" ? "Individuel" : "Groupe"}
            </div>
            <div className="col-span-4 text-sm">
              {e.scheduled_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {new Date(e.scheduled_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                    {" "}à{" "}
                    {new Date(e.scheduled_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" /> Minuterie : {e.duration_minutes} minutes
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="surface-card p-5 text-sm text-muted-foreground">
        <strong className="text-foreground">Politiques et règlements applicables aux évaluations.</strong>{" "}
        Consultez la page Politiques et règlements pour en prendre connaissance.
      </div>
    </div>
  );
}
