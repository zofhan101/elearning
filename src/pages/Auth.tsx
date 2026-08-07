import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Info } from "lucide-react";
import logoFmm from "@/assets/logo-fmm.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});
const requestSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  fullName: z.string().trim().min(2, "Name required").max(100),
  motivation: z.string().trim().max(1000).optional(),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"signin" | "request">("signin");
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [request, setRequest] = useState({ email: "", fullName: "", motivation: "" });
  const [submitted, setSubmitted] = useState(false);

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

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const v = requestSchema.safeParse(request);
      if (!v.success) {
        toast.error(v.error.issues[0].message);
        return;
      }
      const { error } = await supabase.from("signup_requests").insert({
        email: v.data.email,
        full_name: v.data.fullName,
        motivation: v.data.motivation || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("A request already exists for this email.");
        } else {
          throw error;
        }
        return;
      }
      setSubmitted(true);
      toast.success("Request sent. An administrator will contact you.");
    } catch (err: any) {
      toast.error(err.message ?? "Error sending request");
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
          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSubmitted(false); }}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="request">Create My Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="m-0">
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
            </TabsContent>

            <TabsContent value="request" className="m-0">
              {submitted ? (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 items-center justify-center">
                    <Info className="h-6 w-6 text-emerald-700" />
                  </div>
                  <h3 className="font-semibold">Request Sent</h3>
                  <p className="text-sm text-muted-foreground">
                    An administrator will review your request. You will receive an invitation email
                    once the request is approved to set your password.
                  </p>
                  <Button variant="outline" onClick={() => { setTab("signin"); setSubmitted(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>New accounts must be validated by an administrator. You will receive an invitation email once your request is approved.</span>
                  </div>
                  <form onSubmit={handleRequest} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={request.fullName}
                        onChange={(e) => setRequest({ ...request, fullName: e.target.value })}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reqEmail">Email</Label>
                      <Input
                        id="reqEmail"
                        type="email"
                        value={request.email}
                        onChange={(e) => setRequest({ ...request, email: e.target.value })}
                        placeholder="you@univ-antananarivo.mg"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motivation">Motivation (optional)</Label>
                      <Textarea
                        id="motivation"
                        value={request.motivation}
                        onChange={(e) => setRequest({ ...request, motivation: e.target.value })}
                        placeholder="Program, cohort, reason for the request…"
                        className="min-h-[80px]"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Sending…" : "Send My Request"}
                    </Button>
                  </form>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Faculty of Medicine Antananarivo — Learning space.
        </p>
      </div>
    </div>
  );
}
