import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
  { v: "medecine_humaine", l: "Médecine Humaine" },
  { v: "pharmacie", l: "Pharmacie" },
  { v: "medecine_veterinaire", l: "Médecine Vétérinaire" },
  { v: "sciences_paramedicales", l: "Sciences Paramédicales" },
];
const PARCOURS = [
  { v: "tronc_commun", l: "Tronc Commun" },
  { v: "medecine_humaine", l: "Médecine Humaine" },
  { v: "medecine_veterinaire", l: "Médecine Vétérinaire" },
  { v: "pharmacie", l: "Pharmacie" },
  { v: "anesthesie", l: "Anesthésie" },
  { v: "maieutique", l: "Maïeutique" },
  { v: "infirmier_generaliste", l: "Infirmier Généraliste" },
  { v: "massokinesitherapie", l: "Massokinésithérapie" },
  { v: "ergotherapie", l: "Ergothérapie" },
  { v: "technique_appareillage", l: "Technique d'appareillage" },
  { v: "technique_laboratoire", l: "Technique de Laboratoire" },
  { v: "electroradiologie", l: "Électroradiologie" },
];
const NIVEAUX = ["L1", "L2", "L3", "A4", "A5", "A6", "A7", "A8"];
const ROLES = [
  { v: "enseignant", l: "Enseignant" },
  { v: "pat", l: "PAT" },
  { v: "etudiant", l: "Étudiant" },
];
const ANY = "__any__";

interface Member {
  id: string;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  sexe: "M" | "F" | null;
  adresse: string | null;
  mention: string | null;
  parcours: string | null;
  niveau: string | null;
  member_role: "enseignant" | "pat" | "etudiant" | null;
}

const empty: Partial<Member> = { nom: "", prenom: "", date_naissance: null, sexe: null, adresse: "", mention: null, parcours: null, niveau: null, member_role: null };

export default function AdminMembers() {
  const [list, setList] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Partial<Member>>(empty);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("personnel").select("*").order("nom");
    if (error) return toast.error(error.message);
    setList((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.nom?.trim()) return toast.error("Nom requis");
    const payload: any = {
      nom: editing.nom,
      prenom: editing.prenom || null,
      date_naissance: editing.date_naissance || null,
      sexe: editing.sexe || null,
      adresse: editing.adresse || null,
      mention: editing.mention || null,
      parcours: editing.parcours || null,
      niveau: editing.niveau || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("personnel").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("personnel").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Enregistré");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce membre ?")) return;
    const { error } = await supabase.from("personnel").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = list.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [m.nom, m.prenom, m.mention, m.parcours, m.niveau].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <AppLayout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Membres</h1>
            <p className="text-muted-foreground text-sm">Créez et gérez manuellement les membres (étudiants, personnel).</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" />Nouveau membre</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={editing.nom ?? ""} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} />
                </div>
                <div>
                  <Label>Prénom</Label>
                  <Input value={editing.prenom ?? ""} onChange={(e) => setEditing({ ...editing, prenom: e.target.value })} />
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input type="date" value={editing.date_naissance ?? ""} onChange={(e) => setEditing({ ...editing, date_naissance: e.target.value || null })} />
                </div>
                <div>
                  <Label>Sexe</Label>
                  <Select value={editing.sexe ?? ANY} onValueChange={(v) => setEditing({ ...editing, sexe: v === ANY ? null : (v as "M" | "F") })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Adresse</Label>
                  <Input value={editing.adresse ?? ""} onChange={(e) => setEditing({ ...editing, adresse: e.target.value })} />
                </div>
                <div>
                  <Label>Mention</Label>
                  <Select value={editing.mention ?? ANY} onValueChange={(v) => setEditing({ ...editing, mention: v === ANY ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {MENTIONS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parcours</Label>
                  <Select value={editing.parcours ?? ANY} onValueChange={(v) => setEditing({ ...editing, parcours: v === ANY ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {PARCOURS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Niveau</Label>
                  <Select value={editing.niveau ?? ANY} onValueChange={(v) => setEditing({ ...editing, niveau: v === ANY ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {NIVEAUX.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="surface-card p-3 mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input className="border-0 focus-visible:ring-0" placeholder="Rechercher par nom, mention, parcours…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Mention</TableHead>
                <TableHead>Parcours</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nom}</TableCell>
                  <TableCell>{m.prenom}</TableCell>
                  <TableCell>{m.sexe}</TableCell>
                  <TableCell>{MENTIONS.find((x) => x.v === m.mention)?.l ?? ""}</TableCell>
                  <TableCell>{PARCOURS.find((x) => x.v === m.parcours)?.l ?? ""}</TableCell>
                  <TableCell>{m.niveau}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun membre.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
