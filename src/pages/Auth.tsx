import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import logoFmm from "@/assets/logo-fmm.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [signin, setSignin] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const v = signInSchema.safeParse(signin);
      if (!v.success) {
        toast.error(v.error.issues[0].message);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: v.data.email,
        password: v.data.password,
      });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoFmm} alt="Faculty of Medicine Antananarivo" className="h-20 w-20 mx-auto mb-4 object-contain" />
          
          <h1 className="text-3xl font-semibold text-foreground">Faculty of Medicine Antananarivo</h1>
          <p className="text-muted-foreground mt-1">Your learning space</p>
        </div>

        <div className="surface-card p-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={signin.email}
                onChange={(e) => setSignin({ ...signin, email: e.target.value })}
                placeholder="you@univ-antananarivo.mg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={signin.password}
                onChange={(e) => setSignin({ ...signin, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Faculty of Medicine Antananarivo — Learning space.
        </p>
      </div>
    </div>
  );
}
