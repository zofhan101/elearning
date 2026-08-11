import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CoursePeople() {
  const { id } = useParams();
  const [rows, setRows] = useState<any[]>([]);
  const [hasCohorts, setHasCohorts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { count } = await supabase
        .from("course_cohorts")
        .select("*", { count: "exact", head: true })
        .eq("course_id", id);
      setHasCohorts((count ?? 0) > 0);

      const { data } = await supabase.rpc("course_enrolled_personnel", { _course_id: id });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Enrolled People</h1>
      <p className="text-sm text-muted-foreground -mt-4">
        Determined automatically by cohort membership — add or remove people from this course's cohorts under Administration → Cohorts.
      </p>
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {hasCohorts ? "No one in the linked cohort(s) yet." : "This course has no cohort — it is visible to everyone."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold">
                  {(r.nom?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{[r.nom, r.prenom].filter(Boolean).join(" ") || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email_institutionnel}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

