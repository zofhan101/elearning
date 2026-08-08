import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, X, Upload, UserPlus } from "lucide-react";
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

const MENTIONS = [
  { v: "blended_learning", l: "Blended Learning" },
  { v: "summer_school", l: "Summer School" },
  { v: "field_trip", l: "Field Trip" },
];
const PARCOURS = [
  { v: "germany", l: "Germany" },
  { v: "madagascar", l: "Madagascar" },
  { v: "indonesia", l: "Indonesia" },
];
const ROLES = [
  { v: "enseignant", l: "Instructor" },
  { v: "pat", l: "PAT" },
  { v: "etudiant", l: "Student" },
  { v: "admin", l: "Admin" },
];

const ANY = "__any__";

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  mention: string | null;
  parcours: string | null;
}

interface Member { id: string; user_id: string; full_name?: string; email?: string }

const empty: Partial<Cohort> = { name: "", description: "", mention: null, parcours: null };

export default function AdminCohorts() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Cohort>>(empty);
  const [membersFor, setMembersFor] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [quickNom, setQuickNom] = useState("");
  const [quickPrenom, setQuickPrenom] = useState("");
  const [quickDateNaissance, setQuickDateNaissance] = useState("");
  const [quickSexe, setQuickSexe] = useState<"M" | "F" | "">("");
  const [quickAdresse, setQuickAdresse] = useState("");
  const [quickParcours, setQuickParcours] = useState("");
  const [quickRole, setQuickRole] = useState<"enseignant" | "pat" | "etudiant" | "admin" | "">("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("cohorts").select("*").order("name");
    setCohorts((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name required");
    const payload: any = {
      name: editing.name,
      description: editing.description || null,
      mention: editing.mention || null,
      parcours: editing.parcours || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("cohorts").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("cohorts").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this cohort?")) return;
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

  const openPicker = async () => {
    setPickerOpen(true);
    const { data } = await supabase.from("personnel").select("id, nom, prenom, mention, parcours").order("nom").limit(500);
    setPersonnelList((data as any) ?? []);
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("cohort_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (membersFor) loadMembers(membersFor);
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
    if (!lines.length) return [];
    const split = (line: string) => {
      const out: string[] = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
          if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (c === '"') inQ = false;
          else cur += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === "," || c === ";" || c === "\t") { out.push(cur); cur = ""; }
          else cur += c;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = split(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((l) => {
      const cells = split(l);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
      return obj;
    });
  };

  const HEADER_ALIASES: Record<string, string> = {
    nom: "nom", "last name": "nom", lastname: "nom",
    prenom: "prenom", "first name": "prenom", firstname: "prenom",
    date_naissance: "date_naissance", "date of birth": "date_naissance", dob: "date_naissance",
    sexe: "sexe", gender: "sexe",
    adresse: "adresse", address: "adresse",
    parcours: "parcours", country: "parcours",
    member_role: "member_role", role: "member_role",
  };

  const resolveOption = (list: { v: string; l: string }[], raw: string): string | null => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    const byValue = list.find((o) => o.v.toLowerCase() === q);
    if (byValue) return byValue.v;
    const byLabel = list.find((o) => o.l.toLowerCase() === q);
    return byLabel ? byLabel.v : null;
  };

  const importCsv = async (file: File) => {
    if (!membersFor) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) return toast.error("Empty file");

    const toInsert: any[] = [];
    let skipped = 0;
    for (const r of rows) {
      const mapped: Record<string, string> = {};
      for (const key of Object.keys(r)) {
        const canon = HEADER_ALIASES[key];
        if (canon) mapped[canon] = r[key];
      }
      if (!mapped.nom?.trim() || !mapped.member_role?.trim()) { skipped++; continue; }
      const role = resolveOption(ROLES, mapped.member_role);
      if (!role) { skipped++; continue; }
      const sexeRaw = mapped.sexe?.trim().toUpperCase();
      toInsert.push({
        nom: mapped.nom.trim(),
        prenom: mapped.prenom?.trim() || null,
        date_naissance: mapped.date_naissance?.trim() || null,
        sexe: sexeRaw === "M" || sexeRaw === "F" ? sexeRaw : null,
        adresse: mapped.adresse?.trim() || null,
        parcours: resolveOption(PARCOURS, mapped.parcours ?? ""),
        member_role: role,
      });
    }

    if (toInsert.length === 0) {
      return toast.error("No valid rows found (Last Name and Role are required for each row)");
    }

    const { data, error } = await supabase.from("personnel").insert(toInsert).select("id");
    if (error) return toast.error(error.message);

    const cohortLinks = (data ?? []).map((p: any) => ({ cohort_id: membersFor.id, user_id: p.id }));
    const { error: e2 } = await supabase.from("cohort_members").insert(cohortLinks);
    if (e2) return toast.error(e2.message);

    toast.success(`${cohortLinks.length} member(s) created and added${skipped > 0 ? ` (${skipped} row(s) skipped)` : ""}`);
    loadMembers(membersFor);
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Cohorts</h1>
            <p className="text-muted-foreground text-sm">Group students by program, track, level, or a manual list.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" />New Cohort</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Cohort" : "New Cohort"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Program</Label>
                    <Select value={editing.mention ?? ANY} onValueChange={(v) => setEditing({ ...editing, mention: v === ANY ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>— All —</SelectItem>
                        {MENTIONS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Select value={editing.parcours ?? ANY} onValueChange={(v) => setEditing({ ...editing, parcours: v === ANY ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>— All —</SelectItem>
                        {PARCOURS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave the filters empty to use only the manual list. Otherwise, matching students will be included automatically.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
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
                  {[c.mention, c.parcours].filter(Boolean).join(" · ") || "Manual list only"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => loadMembers(c)}>
                  <Users className="h-4 w-4 mr-1" />Members
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
            <div className="surface-card p-8 text-center text-muted-foreground">No cohorts.</div>
          )}
        </div>

        <Dialog open={!!membersFor} onOpenChange={(o) => { if (!o) { setMembersFor(null); setMembers([]); setSearch(""); setResults([]); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Members — {membersFor?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Search for a student (name or email)" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
                <Button variant="outline" onClick={doSearch}>Search</Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />Import CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
                  </label>
                </Button>
                <Button variant="outline" onClick={openPicker}>
                  <UserPlus className="h-4 w-4 mr-1" />Add Manually
                </Button>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Expected CSV columns: <code>nom</code> (Last Name, required), <code>prenom</code>, <code>date_naissance</code>, <code>sexe</code> (M/F), <code>adresse</code>, <code>parcours</code> (Country), <code>member_role</code> (Role, required — values: enseignant/Instructor, pat/PAT, etudiant/Student, admin/Admin). Country accepts either the internal value or the display label. Each row creates a new member and adds them to this cohort.
              </p>

              {results.length > 0 && (
                <div className="surface-card p-2 space-y-1">
                  {results.map((r) => (
                    <div key={r.user_id} className="flex items-center justify-between px-2 py-1 hover:bg-muted rounded">
                      <div className="text-sm">
                        <div className="font-medium">{r.full_name ?? r.email}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addMember(r.user_id)}>Add</Button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div className="text-sm font-medium mb-2">Manual Members ({members.length})</div>
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
                  {members.length === 0 && <div className="text-sm text-muted-foreground">No manual members.</div>}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={pickerOpen} onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) {
            setPersonnelSearch(""); setQuickNom(""); setQuickPrenom("");
            setQuickDateNaissance(""); setQuickSexe(""); setQuickAdresse("");
            setQuickParcours(""); setQuickRole("");
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add a Member — {membersFor?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="surface-card p-3 space-y-3">
                <div className="text-sm font-medium">Create and Add a New Member</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Last Name *</Label>
                    <Input value={quickNom} onChange={(e) => setQuickNom(e.target.value)} />
                  </div>
                  <div>
                    <Label>First Name</Label>
                    <Input value={quickPrenom} onChange={(e) => setQuickPrenom(e.target.value)} />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={quickDateNaissance} onChange={(e) => setQuickDateNaissance(e.target.value)} />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={quickSexe || ANY} onValueChange={(v) => setQuickSexe(v === ANY ? "" : (v as "M" | "F"))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>—</SelectItem>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input value={quickAdresse} onChange={(e) => setQuickAdresse(e.target.value)} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Select value={quickParcours || ANY} onValueChange={(v) => setQuickParcours(v === ANY ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>—</SelectItem>
                        {PARCOURS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select value={quickRole || ANY} onValueChange={(v) => setQuickRole(v === ANY ? "" : (v as "enseignant" | "pat" | "etudiant" | "admin"))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>—</SelectItem>
                        {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    disabled={creating || !quickNom.trim() || !quickRole || !membersFor}
                    onClick={async () => {
                      if (!membersFor) return;
                      setCreating(true);
                      const { data, error } = await supabase
                        .from("personnel")
                        .insert({
                          nom: quickNom.trim(),
                          prenom: quickPrenom.trim() || null,
                          date_naissance: quickDateNaissance || null,
                          sexe: quickSexe || null,
                          adresse: quickAdresse.trim() || null,
                          parcours: quickParcours || null,
                          member_role: quickRole || null,
                        } as any)
                        .select("id")
                        .single();
                      if (error || !data) { setCreating(false); return toast.error(error?.message ?? "Error"); }
                      const { error: e2 } = await supabase
                        .from("cohort_members")
                        .insert({ cohort_id: membersFor.id, user_id: data.id });
                      setCreating(false);
                      if (e2) return toast.error(e2.message);
                      toast.success("Member created and added");
                      setQuickNom(""); setQuickPrenom(""); setQuickDateNaissance("");
                      setQuickSexe(""); setQuickAdresse("");
                      setQuickParcours(""); setQuickRole("");
                      await openPicker();
                      loadMembers(membersFor);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Choose an Existing Member</div>
                <Input placeholder="Filter by last name, first name, program…" value={personnelSearch} onChange={(e) => setPersonnelSearch(e.target.value)} />
              </div>
              <div className="max-h-[360px] overflow-y-auto space-y-1">
                {personnelList
                  .filter((p) => {
                    if (!personnelSearch.trim()) return true;
                    const q = personnelSearch.toLowerCase();
                    return [p.nom, p.prenom, p.mention, p.parcours].some((v: any) => v?.toLowerCase().includes(q));
                  })
                  .map((p) => {
                    const already = members.some((m) => m.user_id === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 surface-card">
                        <div className="text-sm">
                          <div className="font-medium">{[p.nom, p.prenom].filter(Boolean).join(" ") || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[p.mention, p.parcours].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" disabled={already} onClick={async () => { await addMember(p.id); }}>
                          {already ? "Already a member" : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                {personnelList.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">No existing members. Use the form above to create one.</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
