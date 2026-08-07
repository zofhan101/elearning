import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Search, Save } from "lucide-react";

type Mention = "medecine_humaine" | "pharmacie" | "medecine_veterinaire" | "sciences_paramedicales";
type Parcours =
  | "anesthesie" | "maieutique" | "infirmier_generaliste" | "massokinesitherapie"
  | "ergotherapie" | "technique_appareillage" | "technique_laboratoire" | "electroradiologie"
  | "tronc_commun" | "medecine_humaine" | "medecine_veterinaire" | "pharmacie";
type Niveau = "L1" | "L2" | "L3" | "A4" | "A5" | "A6" | "A7" | "A8";

interface Personnel {
  id: string;
  matricule: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  adresse: string | null;
  pere: string | null;
  mere: string | null;
  email_personnel: string | null;
  email_institutionnel: string | null;
  mention: Mention | null;
  parcours: Parcours | null;
  niveau: Niveau | null;
}

const MENTIONS: { value: Mention; label: string }[] = [
  { value: "medecine_humaine", label: "Human Medicine" },
  { value: "pharmacie", label: "Pharmacy" },
  { value: "medecine_veterinaire", label: "Veterinary Medicine" },
  { value: "sciences_paramedicales", label: "Paramedical Sciences" },
];

const PARCOURS: { value: Parcours; label: string }[] = [
  { value: "tronc_commun", label: "Common Core" },
  { value: "medecine_humaine", label: "Human Medicine" },
  { value: "medecine_veterinaire", label: "Veterinary Medicine" },
  { value: "pharmacie", label: "Pharmacy" },
  { value: "anesthesie", label: "Anesthesia" },
  { value: "maieutique", label: "Midwifery" },
  { value: "infirmier_generaliste", label: "General Nursing" },
  { value: "massokinesitherapie", label: "Physical Therapy" },
  { value: "ergotherapie", label: "Occupational Therapy" },
  { value: "technique_appareillage", label: "Prosthetic Technology" },
  { value: "technique_laboratoire", label: "Laboratory Technology" },
  { value: "electroradiologie", label: "Radiologic Technology" },
];

const NIVEAUX: { value: Niveau; label: string }[] = [
  { value: "L1", label: "L1" }, { value: "L2", label: "L2" }, { value: "L3", label: "L3" },
  { value: "A4", label: "Year 4" }, { value: "A5", label: "Year 5" },
  { value: "A6", label: "Year 6" }, { value: "A7", label: "Year 7" }, { value: "A8", label: "Year 8" },
];

const labelOf = <T extends string>(arr: { value: T; label: string }[], v: T | null) =>
  arr.find(x => x.value === v)?.label ?? "";

export default function Personnel() {
  const { user, isAdmin } = useAuth();
  const [me, setMe] = useState<Personnel | null>(null);
  const [list, setList] = useState<Personnel[]>([]);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    if (isAdmin) {
      const { data, error } = await supabase.from("personnel").select("*").order("nom");
      if (error) toast.error(error.message); else setList((data ?? []) as Personnel[]);
      const mine = (data ?? []).find((p: any) => p.id === user?.id) ?? null;
      setMe(mine as Personnel | null);
    } else {
      const { data, error } = await supabase.from("personnel").select("*").eq("id", user!.id).maybeSingle();
      if (error) toast.error(error.message); else setMe(data as Personnel | null);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p =>
      [p.matricule, p.nom, p.prenom, p.email_institutionnel, p.email_personnel]
        .filter(Boolean).some(v => (v as string).toLowerCase().includes(q))
    );
  }, [list, search]);

  const save = async (row: Personnel) => {
    const { id, ...payload } = row;
    const { error } = await supabase.from("personnel").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) return toast.error("Empty CSV");
    const required = ["id"];
    const headers = Object.keys(rows[0]);
    if (!required.every(r => headers.includes(r))) {
      return toast.error("The CSV must contain at minimum the 'id' column (user account UUID)");
    }
    let ok = 0, fail = 0;
    for (const r of rows) {
      const { id, ...rest } = r;
      const clean: any = {};
      for (const k of Object.keys(rest)) {
        const v = rest[k]?.trim();
        clean[k] = v === "" ? null : v;
      }
      const { error } = await supabase.from("personnel").update(clean).eq("id", id);
      if (error) fail++; else ok++;
    }
    toast.success(`Import completed: ${ok} updated, ${fail} failed`);
    load();
  };

  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">My Personal File</h1>
          <p className="text-sm text-muted-foreground">Administrative and academic information</p>
        </div>

        {me && <PersonnelForm value={me} onSave={save} />}

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Directory</CardTitle>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Import CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="ID number, name, email…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground">
                Expected CSV format: columns <code>id, matricule, nom, prenom, date_naissance, adresse, pere, mere, email_personnel, email_institutionnel, mention, parcours, niveau</code>. The <code>id</code> field is the account UUID. One row per user.
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Institutional Email</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                    {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No results</TableCell></TableRow>}
                    {filtered.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.matricule ?? "—"}</TableCell>
                        <TableCell>{p.nom ?? "—"}</TableCell>
                        <TableCell>{p.prenom ?? "—"}</TableCell>
                        <TableCell className="text-xs">{p.email_institutionnel ?? "—"}</TableCell>
                        <TableCell className="text-xs">{labelOf(MENTIONS, p.mention)}</TableCell>
                        <TableCell className="text-xs">{labelOf(PARCOURS, p.parcours)}</TableCell>
                        <TableCell className="text-xs">{labelOf(NIVEAUX, p.niveau)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {editing && (
          <Card className="border-primary">
            <CardHeader><CardTitle>Editing — {editing.nom} {editing.prenom}</CardTitle></CardHeader>
            <CardContent>
              <PersonnelForm value={editing} onSave={save} onCancel={() => setEditing(null)} />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function PersonnelForm({ value, onSave, onCancel }: { value: Personnel; onSave: (p: Personnel) => void; onCancel?: () => void }) {
  const [v, setV] = useState<Personnel>(value);
  useEffect(() => setV(value), [value]);
  const set = (k: keyof Personnel, val: any) => setV(s => ({ ...s, [k]: val === "" ? null : val }));

  return (
    <Card>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="ID Number"><Input value={v.matricule ?? ""} onChange={e => set("matricule", e.target.value)} /></Field>
        <Field label="Date of Birth"><Input type="date" value={v.date_naissance ?? ""} onChange={e => set("date_naissance", e.target.value)} /></Field>
        <Field label="Last Name"><Input value={v.nom ?? ""} onChange={e => set("nom", e.target.value)} /></Field>
        <Field label="First Name"><Input value={v.prenom ?? ""} onChange={e => set("prenom", e.target.value)} /></Field>
        <Field label="Address" full><Input value={v.adresse ?? ""} onChange={e => set("adresse", e.target.value)} /></Field>
        <Field label="Father"><Input value={v.pere ?? ""} onChange={e => set("pere", e.target.value)} /></Field>
        <Field label="Mother"><Input value={v.mere ?? ""} onChange={e => set("mere", e.target.value)} /></Field>
        <Field label="Personal Email"><Input type="email" value={v.email_personnel ?? ""} onChange={e => set("email_personnel", e.target.value)} /></Field>
        <Field label="Institutional Email"><Input type="email" value={v.email_institutionnel ?? ""} onChange={e => set("email_institutionnel", e.target.value)} /></Field>
        <Field label="Program">
          <Select value={v.mention ?? ""} onValueChange={(x) => set("mention", x)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{MENTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Track">
          <Select value={v.parcours ?? ""} onValueChange={(x) => set("parcours", x)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{PARCOURS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Level of Study">
          <Select value={v.niveau ?? ""} onValueChange={(x) => set("niveau", x)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{NIVEAUX.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button onClick={() => onSave(v)}><Save className="h-4 w-4 mr-2" />Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
  if (!lines.length) return [];
  const split = (line: string) => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === "," || c === ";") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const cells = split(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => obj[h] = (cells[i] ?? "").trim());
    return obj;
  });
}
