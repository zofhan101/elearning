import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe2, Eye, Activity, Printer } from "lucide-react";

const MENTION_LABELS: Record<string, string> = {
  blended_learning: "Blended Learning",
  summer_school: "Summer School",
  field_trip: "Field Trip",
};
const PARCOURS_LABELS: Record<string, string> = {
  germany: "Germany",
  madagascar: "Madagascar",
  indonesia: "Indonesia",
};
const ROLE_LABELS: Record<string, string> = {
  enseignant: "Instructor",
  pat: "PAT",
  etudiant: "Student",
  admin: "Admin",
};
const KIND_LABELS: Record<string, string> = {
  text: "Rich Text",
  video: "Video",
  link: "External Link",
  file: "File",
  forum: "Forum",
  videoconference: "Video Conference",
};

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined, labels?: Record<string, string>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = key(row);
    if (!raw) continue;
    const label = labels?.[raw] ?? raw;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export default function AdminStatistics() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  const [personnel, setPersonnel] = useState<any[]>([]);
  const [views, setViews] = useState<any[]>([]);
  const [logins, setLogins] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const [p, v, l] = await Promise.all([
        supabase.from("personnel").select("mention, parcours, member_role"),
        supabase
          .from("content_views")
          .select("id, viewed_at, content_block_id, content_blocks(title, kind)")
          .order("viewed_at", { ascending: false })
          .limit(5000),
        supabase.from("login_events").select("user_id, day, visits").order("day", { ascending: true }),
      ]);
      setPersonnel(p.data ?? []);
      setViews(v.data ?? []);
      setLogins(l.data ?? []);
      setLoading(false);
    })();
  }, [isAdmin]);

  // --- Demographics ---
  const byCountry = useMemo(() => countBy(personnel, (p) => p.parcours, PARCOURS_LABELS), [personnel]);
  const byProgram = useMemo(() => countBy(personnel, (p) => p.mention, MENTION_LABELS), [personnel]);
  const byRole = useMemo(() => countBy(personnel, (p) => p.member_role, ROLE_LABELS), [personnel]);

  // --- Content engagement ---
  const topContent = useMemo(() => {
    const map = new Map<string, { title: string; kind: string; count: number }>();
    for (const v of views) {
      const cb = v.content_blocks;
      if (!cb) continue;
      const existing = map.get(v.content_block_id);
      if (existing) existing.count += 1;
      else map.set(v.content_block_id, { title: cb.title, kind: cb.kind, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [views]);

  const byKind = useMemo(() => countBy(views, (v) => v.content_blocks?.kind, KIND_LABELS), [views]);

  const viewsOverTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of views) {
      const day = new Date(v.viewed_at).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [views]);

  // --- Login frequency ---
  const dailyActive = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of logins) {
      if (!map.has(l.day)) map.set(l.day, new Set());
      map.get(l.day)!.add(l.user_id);
    }
    return Array.from(map.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [logins]);

  const activeCounts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const uniq = (since: string) => new Set(logins.filter((l) => l.day >= since).map((l) => l.user_id)).size;
    return {
      today: uniq(today),
      week: uniq(weekAgo),
      month: uniq(monthAgo),
    };
  }, [logins]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container py-16 text-center">
          <h1 className="text-xl font-semibold mb-2">Restricted Access</h1>
          <p className="text-muted-foreground mb-4">This page is restricted to administrators.</p>
          <Button asChild><Link to="/">Back</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-6xl space-y-10">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Statistics</h1>
            <p className="text-muted-foreground text-sm">Demographic breakdown, content engagement, and login activity.</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Export as PDF
          </Button>
        </div>

        {/* Print-only header — shown only when exporting/printing */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-semibold">Healthy Paths Project — Statistics Report</h1>
          <p className="text-sm text-muted-foreground">
            Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {/* Demographics */}
            <section>
              <h2 className="font-semibold flex items-center gap-2 mb-4"><Globe2 className="h-4 w-4" /> Demographic Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="By Country">
                  <PieChart>
                    <Pie data={byCountry} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {byCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartCard>
                <ChartCard title="By Program">
                  <PieChart>
                    <Pie data={byProgram} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {byProgram.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartCard>
                <ChartCard title="By Role">
                  <BarChart data={byRole}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            </section>

            {/* Content engagement */}
            <section className="print:break-before-page">
              <h2 className="font-semibold flex items-center gap-2 mb-4"><Eye className="h-4 w-4" /> Content Engagement</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title="Views Over Time (last 30 days)">
                  <LineChart data={viewsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartCard>
                <ChartCard title="Views by Content Type">
                  <BarChart data={byKind} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
              <div className="surface-card p-5 print:break-inside-avoid">
                <div className="text-sm font-medium mb-3">Most Viewed Content</div>
                {topContent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No views recorded yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {topContent.map((c, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <div className="truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{KIND_LABELS[c.kind] ?? c.kind}</div>
                        </div>
                        <div className="font-semibold tabular-nums shrink-0 ml-3">{c.count} view{c.count > 1 ? "s" : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Login frequency */}
            <section className="print:break-before-page">
              <h2 className="font-semibold flex items-center gap-2 mb-4"><Activity className="h-4 w-4" /> Login Frequency</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatCard label="Active Today" value={activeCounts.today} />
                <StatCard label="Active This Week" value={activeCounts.week} />
                <StatCard label="Active This Month" value={activeCounts.month} />
              </div>
              <ChartCard title="Daily Active Users (last 30 days)">
                <BarChart data={dailyActive}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5 print:break-inside-avoid">
      <div className="text-sm font-medium mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={220}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-5 text-center">
      <div className="text-3xl font-bold text-primary tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
