import { ReactNode, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, User as UserIcon, Compass, ShieldCheck, FolderKanban, Settings, ChevronDown, IdCard, Menu } from "lucide-react";
import logoFmm from "@/assets/logo-fmm.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoFmm} alt="Faculté de Médecine Antananarivo" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <div className="font-semibold text-foreground text-base">Faculté de Médecine Antananarivo</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Espace pédagogique</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Mon parcours" />
            <NavItem to="/explorer" icon={<Compass className="h-4 w-4" />} label="Explorer" />
            <NavItem to="/echanges" icon={<FolderKanban className="h-4 w-4" />} label="Échanges" />
            <NavItem to="/personnel" icon={<IdCard className="h-4 w-4" />} label="Mon dossier" />
            {isStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4" />
                    Administration
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/admin/cours")}>Cours & contenus</DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/inscriptions")}>
                      <ShieldCheck className="h-4 w-4 mr-2" />Demandes d'inscription
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isStaff && (
              <span className="hidden sm:inline-flex text-xs font-medium px-2 py-1 rounded-md bg-primary-soft text-primary">
                Enseignant
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Se déconnecter">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container py-6 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <div className="flex flex-wrap gap-x-4">
            <span>Contactez-nous</span>
            <span>Centre d'aide</span>
            <span>Accessibilité</span>
            <span>Conditions d'utilisation</span>
            <span>Confidentialité et témoins</span>
          </div>
          <div>Faculté de Médecine Antananarivo · Français</div>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
