import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";

type Req = {
  id: string;
  full_name: string;
  email: string;
  motivation: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminSignupRequests() {
  const { isAdmin, loading } = useAuth();
  const [items, setItems] = useState<Req[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(true);

  const load = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("signup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Req[]);
    setFetching(false);
  };

  useEffect(() => {
    if (!loading && isAdmin) load();
  }, [loading, isAdmin]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-signup", {
        body: { request_id: id, action, admin_notes: notes[id] ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(action === "approve" ? "Request approved — invitation sent" : "Request rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="surface-card p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">Restricted Access</h1>
          <p className="text-muted-foreground mb-4">This page is restricted to administrators.</p>
          <Button asChild><Link to="/">Back</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-soft p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
            <h1 className="text-2xl font-semibold">Signup Requests</h1>
            <p className="text-muted-foreground text-sm">Approve or reject new account requests.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={fetching}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {items.length === 0 && !fetching && (
          <div className="surface-card p-10 text-center text-muted-foreground">No requests yet.</div>
        )}

        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{r.full_name}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{r.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted on {new Date(r.created_at).toLocaleString("en-US")}
                  </p>
                  {r.motivation && (
                    <p className="mt-3 text-sm whitespace-pre-wrap border-l-2 border-border pl-3">{r.motivation}</p>
                  )}
                  {r.admin_notes && (
                    <p className="mt-2 text-xs text-muted-foreground">Admin note: {r.admin_notes}</p>
                  )}
                </div>
              </div>

              {r.status === "pending" && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Internal note (optional)"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(r.id, "approve")} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")} disabled={busyId === r.id}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Req["status"] }) {
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
}
