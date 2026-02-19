import { Link, useLocation } from "react-router-dom";
import { BookOpen, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/books", label: "Books" },
    ...(!user ? [
      { to: "/register", label: "Register" },
      { to: "/login", label: "Login" },
    ] : [
      { to: "/issue", label: "Issue / Return" },
      ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
    ]),
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 bg-navy shadow-elevated border-b border-navy-light/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-amber-glow flex items-center justify-center shadow-amber flex-shrink-0">
              <BookOpen className="w-5 h-5 text-navy-deep" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-base font-bold text-primary-foreground leading-tight">Library Hub</p>
              <p className="text-[10px] text-sidebar-foreground/60 leading-none">Management System</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link text-sidebar-foreground hover:text-amber-glow ${
                  isActive(link.to) ? "text-amber-glow active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-light/50">
                  <User className="w-3.5 h-3.5 text-amber-glow" />
                  <span className="text-xs text-sidebar-foreground">{user.email?.split("@")[0]}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-glow text-navy-deep">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-amber-glow transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-amber-glow text-navy-deep hover:bg-amber-light font-semibold shadow-amber">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-sidebar-foreground hover:text-amber-glow transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-navy-light/30 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.to) ? "text-amber-glow" : "text-sidebar-foreground hover:text-amber-glow"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="block py-2.5 text-sm text-sidebar-foreground/70 hover:text-amber-glow transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
