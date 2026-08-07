import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import logoFmm from "@/assets/logo-fmm.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const recoveryEmailSchema = z.string().trim().email("Invalid email address").max(255);

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

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

  const openRecovery = () => {
    setRecoveryEmail(signin.email);
    setRecoverySent(false);
    setRecoveryOpen(true);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = recoveryEmailSchema.safeParse(recoveryEmail);
    if (!v.success) {
      toast.error(v.error.issues[0].message);
      return;
    }
    setRecoveryBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: v.data },
      });
      if (error) {
        let message = error.message ?? "Error sending recovery email";
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
      setRecoverySent(true);
    } catch (err: any) {
      toast.error(err.message ?? "Error sending recovery email");
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoFmm} alt="Healthy Paths Project Logo" className="h-32 w-32 mx-auto mb-4 object-contain" />
          
          <h1 className="text-3xl font-semibold text-foreground">Healthy Paths Project</h1>
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
                placeholder="your email address"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Your Password</Label>
                <button
                  type="button"
                  onClick={openRecovery}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
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
          LARTIC Laboratory ~ Faculty of Medicine Antananarivo — Learning space.
        </p>
      </div>

      <Dialog open={recoveryOpen} onOpenChange={(o) => { setRecoveryOpen(o); if (!o) setRecoverySent(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
          </DialogHeader>
          {recoverySent ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                A password reset email has been sent to <span className="font-medium text-foreground">{recoveryEmail}</span>. Check your inbox (and spam folder) for the link.
              </p>
              <Button className="w-full" variant="outline" onClick={() => setRecoveryOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">Email</Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="your email address"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={recoveryBusy}>
                {recoveryBusy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
