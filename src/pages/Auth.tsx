import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Adresse courriel invalide").max(255),
  password: z.string().min(6, "Au moins 6 caractères").max(72),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Nom requis").max(100),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const v = signUpSchema.safeParse(form);
        if (!v.success) {
          toast.error(v.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: v.data.email,
          password: v.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: v.data.fullName },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Bienvenue !");
        navigate("/");
      } else {
        const v = signInSchema.safeParse(form);
        if (!v.success) {
          toast.error(v.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword(v.data);
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'authentification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl gradient-hero items-center justify-center mb-4 shadow-elevated">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Brio</h1>
          <p className="text-muted-foreground mt-1">Votre espace pédagogique</p>
        </div>

        <div className="surface-card p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="signup" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Lova Narindra Randriamanantsoa"
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email">Courriel</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="vous@exemple.ca"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Patientez…" : tab === "signup" ? "Créer mon compte" : "Se connecter"}
              </Button>
            </form>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Brio, une initiative pédagogique inspirée de l'Université Laval.
        </p>
      </div>
    </div>
  );
}
