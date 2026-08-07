import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Award, Compass, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import logoFmm from "@/assets/logo-fmm.png";

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  group_label: string | null;
  instructor_name: string | null;
  cover_color: string | null;
  is_open: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("attempts").select("id").not("submitted_at", "is", null).eq("user_id", user!.id),
      ]);
      setCourses(c ?? []);
      setCompleted(a?.length ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const firstName = (user?.user_metadata?.full_name as string)?.split(" ")[0] ?? "";

  return (
    <AppLayout>
      <section className="gradient-soft border-b border-border">
        <div className="container py-10">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            My Path{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Find your ongoing courses, upcoming assessments, and your progress.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <StatCard icon={<BookOpen />} label="Active Courses" value={courses.length} />
            <StatCard icon={<CheckCircle2 />} label="Completed Assessments" value={completed} />
            <StatCard icon={<Award />} label="Achievements" value={completed} accent />
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">My Courses</h2>
            <p className="text-sm text-muted-foreground">Access modules, content, and assessments.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/explorer">
              <Compass className="h-4 w-4 mr-2" />
              Explore Courses
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <p className="text-muted-foreground">No courses at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/cours/${c.id}/modules`}
                className="surface-card overflow-hidden group hover:shadow-elevated transition-all"
              >
                <div className="h-24 course-card-header relative">
                  {c.is_open && (
                    <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider bg-success text-success-foreground px-2 py-0.5 rounded">
                      Open
                    </span>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 rounded-md p-1 shadow-sm">
                    <img src={logoFmm} alt="Healthy Paths Project" className="h-6 w-auto object-contain" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {c.group_label}
                  </div>
                  <h3 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  {c.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{c.subtitle}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">{c.instructor_name}</span>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="surface-card p-5 flex items-center gap-4">
      <div
        className={`h-11 w-11 rounded-lg flex items-center justify-center ${
          accent ? "bg-accent text-accent-foreground" : "bg-primary-soft text-primary"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
