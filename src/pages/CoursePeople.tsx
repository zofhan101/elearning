import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CoursePeople() {
  const { id } = useParams();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, profiles:user_id(full_name,email)")
        .eq("course_id", id);
      setRows(data ?? []);
    })();
  }, [id]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Personnes inscrites</h1>
      <div className="surface-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Aucune personne inscrite pour le moment.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold">
                  {(r.profiles?.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{r.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
