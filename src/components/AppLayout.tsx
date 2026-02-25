import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Package, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/billing", label: "New Bill", icon: Plus },
    { path: "/bills", label: "Bills", icon: FileText },
    { path: "/products", label: "Products", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="border-b border-border bg-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-bold text-lg text-primary-foreground">Sadik Traders</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary-foreground/80 hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="md:hidden flex border-t border-primary-foreground/20 overflow-x-auto bg-primary">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium whitespace-nowrap ${
                location.pathname === item.path
                  ? "text-primary-foreground border-b-2 border-primary-foreground"
                  : "text-primary-foreground/60"
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
