import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type Allowed = "admin" | "staff" | "any";

export function RequireRole({ allow, children }: { allow: Allowed; children: ReactNode }) {
  const { user, loading, isAdmin, isStaff } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (allow === "admin" && !isAdmin) return <Navigate to="/" replace />;
  if (allow === "staff" && !isStaff) return <Navigate to="/" replace />;
  return <>{children}</>;
}
