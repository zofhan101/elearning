import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Explorer() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      setCourses(data ?? []);
      const { data: en } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      setEnrolled(new Set((en ?? []).map((e: any) => e.course_id)));
    })();
  }, [user]);

  const enroll = async (id: string) => {
    const { error } = await supabase.from("enrollments").insert({ course_id: id, user_id: user!.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Inscription confirmée");
      setEnrolled((s) => new Set(s).add(id));
    }
  };

  const filtered = courses.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <div className="container py-10">
        <h1 className="text-3xl font-semibold mb-2">Explorer les formations</h1>
        <p className="text-muted-foreground mb-6">Renforcez vos compétences avec nos formations.</p>
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une formation…" className="pl-9" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <div key={c.id} className="surface-card p-5 flex flex-col">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <BookOpen className="h-3.5 w-3.5" />
                {c.group_label}
              </div>
              <h3 className="font-semibold leading-snug">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 flex-1">{c.subtitle}</p>
              <div className="flex gap-2 mt-4">
                {enrolled.has(c.id) ? (
                  <Button asChild className="flex-1">
                    <Link to={`/cours/${c.id}/modules`}>Accéder</Link>
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={() => enroll(c.id)}>
                    S'inscrire
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
