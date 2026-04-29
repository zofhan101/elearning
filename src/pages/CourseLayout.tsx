import { useEffect, useState } from "react";
import { Outlet, useParams, Link } from "react-router-dom";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { CourseSidebar } from "@/components/CourseSidebar";

export default function CourseLayout() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("courses").select("*").eq("id", id).maybeSingle().then(({ data }) => setCourse(data));
  }, [id]);

  return (
    <AppLayout>
      <div className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Mon espace Brio
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm font-medium truncate">{course?.title ?? "…"}</span>
        </div>
        {course && !course.is_open && (
          <div className="container pb-3">
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-warning/15 text-warning-foreground border border-warning/30">
              <AlertCircle className="h-4 w-4" />
              Ce site n'est pas ouvert.
            </div>
          </div>
        )}
      </div>
      <div className="container py-8 flex gap-8">
        <CourseSidebar />
        <div className="flex-1 min-w-0">
          <Outlet context={{ course }} />
        </div>
      </div>
    </AppLayout>
  );
}
