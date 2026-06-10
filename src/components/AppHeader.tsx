import { Link, useRouterState } from "@tanstack/react-router";
import { Trophy, Home, ListChecks, Calendar, BookOpen, ShieldCheck } from "lucide-react";
import { TrophyLogo } from "@/components/TrophyLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/palpites", label: "Meus palpites", icon: ListChecks },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/jogos", label: "Jogos", icon: Calendar },
  { to: "/regras", label: "Regras", icon: BookOpen },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          aria-label="Bolão Copa 2026 — Início"
          className="group flex items-center gap-2"
        >
          <TrophyLogo className="h-10 w-auto" />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            Bolão Copa 2026
          </span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          to="/admin"
          aria-label="Área administrativa"
          className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground md:inline-flex"
        >
          <ShieldCheck className="h-4 w-4" />
          Admin
        </Link>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-6xl items-stretch justify-around">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
