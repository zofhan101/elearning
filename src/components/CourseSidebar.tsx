import { NavLink, useParams } from "react-router-dom";
import { BookOpen, ClipboardCheck, Users, BarChart3, Shield, Info, ChevronRight } from "lucide-react";

const sections = [
  {
    label: "Menu",
    items: [
      { to: "renseignements", icon: Info, label: "General Information" },
      { to: "modules", icon: BookOpen, label: "Content and Activities" },
      { to: "evaluations", icon: ClipboardCheck, label: "Assessments" },
    ],
  },
  {
    label: "Group",
    items: [
      { to: "personnes", icon: Users, label: "Enrolled People" },
      { to: "suivi", icon: BarChart3, label: "Tracking and Statistics" },
    ],
  },
  {
    label: "Settings",
    items: [{ to: "autorisations", icon: Shield, label: "Permissions" }],
  },
];

export function CourseSidebar() {
  const { id } = useParams();
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 surface-card p-3">
        {sections.map((s) => (
          <div key={s.label} className="mb-4 last:mb-0">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <nav className="space-y-0.5">
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={`/cours/${id}/${it.to}`}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors group ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <it.icon className="h-4 w-4" />
                  <span className="flex-1">{it.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1">Training provided by</div>
          Centre Pédagogia
        </div>
      </div>
    </aside>
  );
}
