import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const MENTIONS = ["medecine_humaine", "pharmacie", "medecine_veterinaire", "sciences_paramedicales"];
const PARCOURS = ["anesthesie", "maieutique", "infirmier_generaliste", "massokinesitherapie", "ergotherapie", "technique_appareillage", "technique_laboratoire", "electroradiologie"];
const NIVEAUX = ["L1", "L2", "L3", "A4", "A5", "A6", "A7", "A8"];

const ANY = "__any__";

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mention: string | null;
  parcours: string | null;
  niveau: string | null;
}

interface Member { id: string; user_id: string; full_name?: string; email?: string }

const empty: Partial<Cohort> = { name: "", description: "", mention: null, parcours: null, niveau: null };

export default function AdminCohorts() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Cohort>>(empty);
  const [membersFor, setMembersFor] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Member[]>([]);

  const load = async () => {
    const { data } = await supabase.from("cohorts").select("*").order("name");
    setCohorts((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Nom requis");
    const payload: any = {
      name: editing.name,
      description: editing.description || null,
      mention: editing.mention || null,
      parcours: editing.parcours || null,
      niveau: editing.niveau || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("cohorts").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("cohorts").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Enregistré");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette cohorte ?")) return;
    const { error } = await supabase.from("cohorts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const loadMembers = async (cohort: Cohort) => {
    setMembersFor(cohort);
    const { data } = await supabase
      .from("cohort_members")
      .select("id, user_id")
      .eq("cohort_id", cohort.id);
    const list = (data as any) ?? [];
    if (list.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", list.map((m: any) => m.user_id));
      const byId: any = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      setMembers(list.map((m: any) => ({ ...m, ...byId[m.user_id] })));
    } else setMembers([]);
  };

  const doSearch = async () => {
    if (!search.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(15);
    setResults(((data as any) ?? []).map((p: any) => ({ id: "", user_id: p.id, full_name: p.full_name, email: p.email })));
  };

  const addMember = async (userId: string) => {
    if (!membersFor) return;
    const { error } = await supabase.from("cohort_members").insert({ cohort_id: membersFor.id, user_id: userId });
    if (error) return toast.error(error.message);
    loadMembers(membersFor);
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("cohort_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (membersFor) loadMembers(membersFor);
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Cohortes</h1>
            <p className="text-muted-foreground text-sm">Regroupez les étudiants par mention, parcours, niveau ou liste manuelle.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" />Nouvelle cohorte</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Modifier la cohorte" : "Nouvelle cohorte"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Mention</Label>
                    <Select value={editing.mention ?? ANY} onValueChange={(v) => setEditing({ ...editing, mention: v === ANY ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>— Toutes —</SelectItem>
                        {MENTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parcours</Label>
                    <Select value={editing.parcours ?? ANY} onValueChange={(v) => setEditing({ ...editing, parcours: v === ANY ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>— Tous —</SelectItem>
                        {PARCOURS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select value={editing.niveau ?? ANY} onValueChange={(v) => setEditing({ ...editing, niveau: v === ANY ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>— Tous —</SelectItem>
                        {NIVEAUX.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Laissez vide les filtres pour utiliser uniquement la liste manuelle. Sinon les étudiants correspondants seront inclus automatiquement.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {cohorts.map((c) => (
            <div key={c.id} className="surface-card p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="font-medium">{c.name}</div>
                {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {[c.mention, c.parcours, c.niveau].filter(Boolean).join(" · ") || "Liste manuelle uniquement"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => loadMembers(c)}>
                  <Users className="h-4 w-4 mr-1" />Membres
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {cohorts.length === 0 && (
            <div className="surface-card p-8 text-center text-muted-foreground">Aucune cohorte.</div>
          )}
        </div>

        <Dialog open={!!membersFor} onOpenChange={(o) => { if (!o) { setMembersFor(null); setMembers([]); setSearch(""); setResults([]); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Membres — {membersFor?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Rechercher un étudiant (nom ou email)" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
                <Button variant="outline" onClick={doSearch}>Rechercher</Button>
              </div>
              {results.length > 0 && (
                <div className="surface-card p-2 space-y-1">
                  {results.map((r) => (
                    <div key={r.user_id} className="flex items-center justify-between px-2 py-1 hover:bg-muted rounded">
                      <div className="text-sm">
                        <div className="font-medium">{r.full_name ?? r.email}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addMember(r.user_id)}>Ajouter</Button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div className="text-sm font-medium mb-2">Membres manuels ({members.length})</div>
                <div className="space-y-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 surface-card">
                      <div className="text-sm">
                        <div className="font-medium">{m.full_name ?? m.email}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {members.length === 0 && <div className="text-sm text-muted-foreground">Aucun membre manuel.</div>}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
