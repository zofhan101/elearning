import { ReactNode, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, User as UserIcon, Compass, ShieldCheck, Info, ExternalLink, Settings, ChevronDown, IdCard, Menu, Image as ImageIcon, BarChart3 } from "lucide-react";
import logoFmm from "@/assets/logo-fmm.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoFmm} alt="Faculty of Medicine Antananarivo" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <div className="font-semibold text-foreground text-base">Healthy Paths Project</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Learning space</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="My Path" />
            <NavItem to="/explorer" icon={<Compass className="h-4 w-4" />} label="Explore" />
            <ExternalNavItem href="https://the-healthypaths-project.org/" icon={<Info className="h-4 w-4" />} label="About Project" />
            <NavItem to="/personnel" icon={<IdCard className="h-4 w-4" />} label="My Profile" />
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
                  <DropdownMenuItem onClick={() => navigate("/admin/cours")}>Courses & Content</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/cohortes")}>Cohorts</DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/membres")}>Members</DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/inscriptions")}>
                      <ShieldCheck className="h-4 w-4 mr-2" />Signup Requests
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/parametres")}>
                      <ImageIcon className="h-4 w-4 mr-2" />Site Settings
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/statistiques")}>
                      <BarChart3 className="h-4 w-4 mr-2" />Statistics
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isStaff && (
              <span className="hidden sm:inline-flex text-xs font-medium px-2 py-1 rounded-md bg-primary-soft text-primary">
                Instructor
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-card">
            <div className="container py-2 flex flex-col">
              <MobileItem onClick={() => go("/")} icon={<LayoutDashboard className="h-4 w-4" />} label="My Path" />
              <MobileItem onClick={() => go("/explorer")} icon={<Compass className="h-4 w-4" />} label="Explore" />
              <MobileExternalItem href="https://the-healthypaths-project.org/" icon={<Info className="h-4 w-4" />} label="About Project" onClick={() => setMobileOpen(false)} />
              <MobileItem onClick={() => go("/personnel")} icon={<IdCard className="h-4 w-4" />} label="My Profile" />
              {isStaff && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Administration</div>
                  <MobileItem onClick={() => go("/admin/cours")} icon={<Settings className="h-4 w-4" />} label="Courses & Content" />
                  <MobileItem onClick={() => go("/admin/cohortes")} icon={<Settings className="h-4 w-4" />} label="Cohorts" />
                  {isAdmin && (
                    <MobileItem onClick={() => go("/admin/membres")} icon={<IdCard className="h-4 w-4" />} label="Members" />
                  )}
                  {isAdmin && (
                    <MobileItem onClick={() => go("/admin/inscriptions")} icon={<ShieldCheck className="h-4 w-4" />} label="Signup Requests" />
                  )}
                  {isAdmin && (
                    <MobileItem onClick={() => go("/admin/parametres")} icon={<ImageIcon className="h-4 w-4" />} label="Site Settings" />
                  )}
                  {isAdmin && (
                    <MobileItem onClick={() => go("/admin/statistiques")} icon={<BarChart3 className="h-4 w-4" />} label="Statistics" />
                  )}
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container py-6 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <div className="flex flex-wrap gap-x-4">
            <span>Contact us</span>
            <span>Help Center</span>
            <span>Accessibility</span>
            <span>Terms of Use</span>
            <span>Privacy & Cookies</span>
          </div>
          <div>LARTIC Laboratory - Faculty of Medicine Antananarivo · English</div>
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

function ExternalNavItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function MobileItem({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
    >
      {icon}
      {label}
    </button>
  );
}

function MobileExternalItem({ href, icon, label, onClick }: { href: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
    >
      {icon}
      {label}
      <ExternalLink className="h-3 w-3 ml-auto" />
    </a>
  );
}
