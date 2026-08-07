import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import logoFmm from "@/assets/logo-fmm.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z
  .object({
    password: z.string().min(6, "At least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({ password: "", confirm: "" });

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = schema.safeParse(values);
    if (!v.success) {
      toast.error(v.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: v.data.password });
      if (error) throw error;
      toast.success("Password updated. Please sign in with your new password.");
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message ?? "Error updating password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoFmm} alt="Healthy Paths Project Logo" className="h-32 w-32 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-semibold text-foreground">Reset Your Password</h1>
        </div>

        <div className="surface-card p-6">
          {checking ? (
            <p className="text-sm text-muted-foreground text-center py-4">Checking your link…</p>
          ) : !ready ? (
            <div className="text-center space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one from the sign-in page.
              </p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={values.password}
                  onChange={(e) => setValues({ ...values, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={values.confirm}
                  onChange={(e) => setValues({ ...values, confirm: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          LARTIC Laboratory ~ Faculty of Medicine Antananarivo — Learning space.
        </p>
      </div>
    </div>
  );
}
