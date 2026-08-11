import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Explorer() {
  const [courses, setCourses] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("*").order("position", { ascending: true });
      setCourses(data ?? []);
    })();
  }, []);

  const filtered = courses.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <div className="container py-10">
        <h1 className="text-3xl font-semibold mb-2">Explore Courses</h1>
        <p className="text-muted-foreground mb-6">Search the courses available to you.</p>
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a course…" className="pl-9" />
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
                <Button asChild className="flex-1">
                  <Link to={`/cours/${c.id}/modules`}>Access</Link>
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              No courses found.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

