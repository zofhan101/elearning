import { useOutletContext } from "react-router-dom";
import { Calendar, User, Building2 } from "lucide-react";

export default function CourseInfo() {
  const { course } = useOutletContext<{ course: any }>();
  if (!course) return null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{course.title}</h1>
      <p className="text-muted-foreground">{course.subtitle}</p>
      <div className="surface-card p-6 space-y-4">
        <h2 className="font-semibold">Renseignements généraux</h2>
        <Row icon={<User className="h-4 w-4" />} label="Enseignant responsable" value={course.instructor_name} />
        <Row icon={<Building2 className="h-4 w-4" />} label="Formation offerte par" value={course.offered_by} />
        <Row
          icon={<Calendar className="h-4 w-4" />}
          label="Période"
          value={`Du ${course.start_date ?? "—"} au ${course.end_date ?? "—"}`}
        />
      </div>
      <div className="surface-card p-6">
        <h2 className="font-semibold mb-2">Politiques et règlements</h2>
        <p className="text-sm text-muted-foreground">
          Consultez la page Politiques et règlements pour prendre connaissance des politiques applicables aux évaluations,
          ainsi que les principes directeurs concernant l'utilisation de l'intelligence artificielle.
        </p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium">{value ?? "—"}</div>
      </div>
    </div>
  );
}
