import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, Mail, CheckCircle2, KeyRound, Copy, RefreshCw, Upload, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

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

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const HEADER_ALIASES: Record<string, string> = {
  nom: "nom", "last name": "nom", lastname: "nom",
  prenom: "prenom", "first name": "prenom", firstname: "prenom",
  date_naissance: "date_naissance", "date of birth": "date_naissance", dob: "date_naissance",
  sexe: "sexe", gender: "sexe",
  adresse: "adresse", address: "adresse",
  email_institutionnel: "email_institutionnel", email: "email_institutionnel",
  password: "password", mot_de_passe: "password",
  parcours: "parcours", country: "parcours",
  member_role: "member_role", role: "member_role",
};

function parseCsv(text: string): Record<string, string>[] {
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
}

function resolveOption(list: { v: string; l: string }[], raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const byValue = list.find((o) => o.v.toLowerCase() === q);
  if (byValue) return byValue.v;
  const byLabel = list.find((o) => o.l.toLowerCase() === q);
  return byLabel ? byLabel.v : null;
}

interface Member {
  id: string;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  sexe: "M" | "F" | null;
  adresse: string | null;
  email_institutionnel: string | null;
  mention: string | null;
  parcours: string | null;
  member_role: "enseignant" | "pat" | "etudiant" | "admin" | null;
}

const empty: Partial<Member> = { nom: "", prenom: "", date_naissance: null, sexe: null, adresse: "", email_institutionnel: "", mention: null, parcours: null, member_role: null };

export default function AdminMembers() {
  const [list, setList] = useState<Member[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<Member>>(empty);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Member | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [editingPassword, setEditingPassword] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ done: number; total: number } | null>(null);
  const [csvResults, setCsvResults] = useState<
    { nom: string; email: string; password: string; ok: boolean; error?: string }[] | null
  >(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const isEditingLinked = !!editing.id && linkedIds.has(editing.id);
  const showPasswordField = !isEditingLinked;

  const load = async () => {
    const { data, error } = await supabase.from("personnel").select("*").order("nom");
    if (error) return toast.error(error.message);
    setList((data as any) ?? []);
    const { data: profiles } = await supabase.from("profiles").select("id");
    setLinkedIds(new Set((profiles ?? []).map((p: any) => p.id)));
  };
  useEffect(() => { load(); }, []);

  const invite = async (m: Member) => {
    if (!m.email_institutionnel?.trim()) {
      return toast.error("Add an email address for this member first");
    }
    setInvitingId(m.id);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email: m.email_institutionnel, full_name: [m.prenom, m.nom].filter(Boolean).join(" ") },
      });
      if (error) {
        let message = error.message ?? "Error sending invitation";
        try {
          const body = await error.context?.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore parsing failure, fall back to generic message
        }
        toast.error(message);
        return;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      toast.success(`Invitation sent to ${m.email_institutionnel}`);
    } catch (err: any) {
      toast.error(err.message ?? "Error sending invitation");
    } finally {
      setInvitingId(null);
    }
  };

  const openSetPassword = (m: Member) => {
    setPasswordTarget(m);
    setPasswordValue(generatePassword());
    setPasswordCreated(false);
  };

  const setMemberPassword = async () => {
    if (!passwordTarget) return;
    if (!passwordTarget.email_institutionnel?.trim()) {
      return toast.error("Add an email address for this member first");
    }
    if (passwordValue.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setSettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-member-login", {
        body: {
          email: passwordTarget.email_institutionnel,
          password: passwordValue,
          full_name: [passwordTarget.prenom, passwordTarget.nom].filter(Boolean).join(" "),
        },
      });
      if (error) {
        let message = error.message ?? "Error creating login";
        try {
          const body = await error.context?.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore parsing failure, fall back to generic message
        }
        toast.error(message);
        return;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      setPasswordCreated(true);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Error creating login");
    } finally {
      setSettingPassword(false);
    }
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) return toast.error("Empty file");

    const toInsert: any[] = [];
    const passwords: string[] = [];
    let skipped = 0;
    for (const r of rows) {
      const mapped: Record<string, string> = {};
      for (const key of Object.keys(r)) {
        const canon = HEADER_ALIASES[key];
        if (canon) mapped[canon] = r[key];
      }
      if (!mapped.nom?.trim() || !mapped.email_institutionnel?.trim() || !mapped.member_role?.trim()) {
        skipped++;
        continue;
      }
      const role = resolveOption(ROLES, mapped.member_role);
      if (!role) { skipped++; continue; }
      const sexeRaw = mapped.sexe?.trim().toUpperCase();
      toInsert.push({
        nom: mapped.nom.trim(),
        prenom: mapped.prenom?.trim() || null,
        date_naissance: mapped.date_naissance?.trim() || null,
        sexe: sexeRaw === "M" || sexeRaw === "F" ? sexeRaw : null,
        adresse: mapped.adresse?.trim() || null,
        email_institutionnel: mapped.email_institutionnel.trim(),
        parcours: resolveOption(PARCOURS, mapped.parcours ?? ""),
        member_role: role,
      });
      passwords.push(mapped.password?.trim() || generatePassword());
    }

    if (toInsert.length === 0) {
      return toast.error("No valid rows found (Last Name, Email, and Role are required for each row)");
    }

    setCsvBusy(true);
    setCsvProgress({ done: 0, total: toInsert.length });

    const { data, error } = await supabase
      .from("personnel")
      .insert(toInsert)
      .select("id, nom, email_institutionnel");
    if (error) {
      setCsvBusy(false);
      setCsvProgress(null);
      return toast.error(error.message);
    }

    const created = data ?? [];
    const results: { nom: string; email: string; password: string; ok: boolean; error?: string }[] = [];

    for (let i = 0; i < created.length; i++) {
      const row: any = created[i];
      const password = passwords[i];
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("create-member-login", {
          body: { email: row.email_institutionnel, password, full_name: row.nom },
        });
        let ok = true;
        let errMsg: string | undefined;
        if (fnError) {
          ok = false;
          errMsg = fnError.message ?? "Error";
          try {
            const body = await fnError.context?.json();
            if (body?.error) errMsg = body.error;
          } catch {
            // ignore parsing failure, fall back to generic message
          }
        } else if ((fnData as any)?.error) {
          ok = false;
          errMsg = (fnData as any).error;
        }
        results.push({ nom: row.nom, email: row.email_institutionnel, password, ok, error: errMsg });
      } catch (err: any) {
        results.push({ nom: row.nom, email: row.email_institutionnel, password, ok: false, error: err.message });
      }
      setCsvProgress({ done: i + 1, total: created.length });
    }

    setCsvBusy(false);
    setCsvProgress(null);
    setCsvResults(results);
    load();
  };

  const save = async () => {
    if (!editing.nom?.trim()) return toast.error("Name required");
    if (!editing.member_role) return toast.error("Role required");
    if (!editing.email_institutionnel?.trim()) return toast.error("Email required");
    if (showPasswordField && editingPassword.trim().length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    const email = editing.email_institutionnel.trim();
    const payload: any = {
      nom: editing.nom,
      prenom: editing.prenom || null,
      date_naissance: editing.date_naissance || null,
      sexe: editing.sexe || null,
      adresse: editing.adresse || null,
      email_institutionnel: email,
      mention: editing.mention || null,
      parcours: editing.parcours || null,
      member_role: editing.member_role,
    };

    if (editing.id) {
      const { error } = await supabase.from("personnel").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("personnel").insert(payload);
      if (error) return toast.error(error.message);
    }

    if (showPasswordField && editingPassword.trim()) {
      const fullName = [editing.prenom, editing.nom].filter(Boolean).join(" ");
      const { data, error } = await supabase.functions.invoke("create-member-login", {
        body: { email, password: editingPassword.trim(), full_name: fullName },
      });
      let loginError: string | null = null;
      if (error) {
        loginError = error.message ?? "Error creating login";
        try {
          const body = await error.context?.json();
          if (body?.error) loginError = body.error;
        } catch {
          // ignore parsing failure, fall back to generic message
        }
      } else if ((data as any)?.error) {
        loginError = (data as any).error;
      }

      if (loginError) {
        toast.error(`Member saved, but login creation failed: ${loginError}`);
        setOpen(false); setEditing(empty); setEditingPassword(""); load();
        return;
      }

      setOpen(false); setEditing(empty);
      load();
      // Reuse the credentials-confirmation view from the Set Password dialog
      setPasswordTarget({ ...(editing as Member), email_institutionnel: email });
      setPasswordValue(editingPassword.trim());
      setPasswordCreated(true);
      setEditingPassword("");
      return;
    }

    toast.success("Saved");
    setOpen(false); setEditing(empty); setEditingPassword(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    const { error } = await supabase.from("personnel").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = list.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [m.nom, m.prenom, m.mention, m.parcours, m.email_institutionnel].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <AppLayout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Members</h1>
            <p className="text-muted-foreground text-sm">Manually create and manage members (students, staff).</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" disabled={csvBusy} onClick={() => csvFileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              {csvBusy ? `Importing ${csvProgress?.done ?? 0}/${csvProgress?.total ?? 0}…` : "Upload Members (CSV)"}
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(empty); setEditingPassword(""); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditing(empty); setEditingPassword(generatePassword()); }}><Plus className="h-4 w-4 mr-1" />New Member</Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editing.id
                    ? (showPasswordField ? "Edit Member & Create Login" : "Edit Member")
                    : "New Member"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Last Name *</Label>
                  <Input value={editing.nom ?? ""} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} />
                </div>
                <div>
                  <Label>First Name</Label>
                  <Input value={editing.prenom ?? ""} onChange={(e) => setEditing({ ...editing, prenom: e.target.value })} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editing.date_naissance ?? ""} onChange={(e) => setEditing({ ...editing, date_naissance: e.target.value || null })} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={editing.sexe ?? ANY} onValueChange={(v) => setEditing({ ...editing, sexe: v === ANY ? null : (v as "M" | "F") })}>
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
                  <Input value={editing.adresse ?? ""} onChange={(e) => setEditing({ ...editing, adresse: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Email *</Label>
                  <Input type="email" value={editing.email_institutionnel ?? ""} onChange={(e) => setEditing({ ...editing, email_institutionnel: e.target.value })} placeholder="name@example.com" />
                  <p className="text-xs text-muted-foreground mt-1">Used as this member's login.</p>
                </div>
                {showPasswordField && (
                  <div className="col-span-2">
                    <Label>Password *</Label>
                    <div className="flex gap-2">
                      <Input value={editingPassword} onChange={(e) => setEditingPassword(e.target.value)} />
                      <Button type="button" variant="outline" size="icon" onClick={() => setEditingPassword(generatePassword())} title="Generate a new password">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">At least 6 characters. The login is created immediately — no email is sent.</p>
                  </div>
                )}
                <div>
                  <Label>Country</Label>
                  <Select value={editing.parcours ?? ANY} onValueChange={(v) => setEditing({ ...editing, parcours: v === ANY ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {PARCOURS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select value={editing.member_role ?? ANY} onValueChange={(v) => setEditing({ ...editing, member_role: v === ANY ? null : (v as any) })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{showPasswordField ? "Create Member & Login" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="surface-card p-3 mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input className="border-0 focus-visible:ring-0" placeholder="Search by name, program, country…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          CSV columns: <code>nom</code> (Last Name, required), <code>prenom</code>, <code>date_naissance</code>, <code>sexe</code> (M/F), <code>adresse</code>, <code>email_institutionnel</code> (Email, required), <code>password</code> (optional — auto-generated if omitted), <code>parcours</code> (Country), <code>member_role</code> (Role, required). A login is created for every row immediately.
        </p>

        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Last Name</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nom}</TableCell>
                  <TableCell>{m.prenom}</TableCell>
                  <TableCell>{ROLES.find((x) => x.v === m.member_role)?.l ?? ""}</TableCell>
                  <TableCell>{m.sexe}</TableCell>
                  <TableCell>{MENTIONS.find((x) => x.v === m.mention)?.l ?? ""}</TableCell>
                  <TableCell>{PARCOURS.find((x) => x.v === m.parcours)?.l ?? ""}</TableCell>
                  <TableCell>
                    {linkedIds.has(m.id) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={invitingId === m.id}
                          onClick={() => invite(m)}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" />
                          {invitingId === m.id ? "Sending…" : "Invite"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openSetPassword(m)}>
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Set Password
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setEditingPassword(linkedIds.has(m.id) ? "" : generatePassword()); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No members.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!passwordTarget} onOpenChange={(o) => { if (!o) setPasswordTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password — {passwordTarget?.nom} {passwordTarget?.prenom}</DialogTitle>
          </DialogHeader>
          {passwordCreated ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Login created and already active — no email was sent. Share these credentials with the member yourself (e.g. in your tutorial):
              </p>
              <div className="surface-card p-3 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-mono">{passwordTarget?.email_institutionnel}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-mono">{passwordValue}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { navigator.clipboard.writeText(passwordValue); toast.success("Password copied"); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The member can change this password themselves anytime from the "My Profile" menu once logged in.
              </p>
              <DialogFooter>
                <Button onClick={() => setPasswordTarget(null)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {!passwordTarget?.email_institutionnel?.trim() && (
                <p className="text-xs text-destructive">
                  This member has no email yet. Cancel, edit the member to add one, then try again.
                </p>
              )}
              <div>
                <Label>Email</Label>
                <Input value={passwordTarget?.email_institutionnel ?? ""} disabled />
              </div>
              <div>
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} />
                  <Button type="button" variant="outline" size="icon" onClick={() => setPasswordValue(generatePassword())} title="Generate a new password">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">At least 6 characters. You'll be able to copy it after creating the login.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPasswordTarget(null)}>Cancel</Button>
                <Button onClick={setMemberPassword} disabled={settingPassword || !passwordTarget?.email_institutionnel?.trim()}>
                  {settingPassword ? "Creating…" : "Create Login"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!csvResults} onOpenChange={(o) => { if (!o) setCsvResults(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {csvResults?.filter((r) => r.ok).length} of {csvResults?.length} logins created — no emails were sent. Copy these credentials to share with your tutorial.
            </p>
            <div className="rounded-lg border overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvResults?.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nom}</TableCell>
                      <TableCell className="font-mono text-xs">{r.email}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ok ? r.password : "—"}</TableCell>
                      <TableCell>
                        {r.ok ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Created
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive" title={r.error}>
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const text = (csvResults ?? [])
                  .filter((r) => r.ok)
                  .map((r) => `${r.nom}\t${r.email}\t${r.password}`)
                  .join("\n");
                navigator.clipboard.writeText(text);
                toast.success("Credentials copied");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy All Credentials
            </Button>
            <Button onClick={() => setCsvResults(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
