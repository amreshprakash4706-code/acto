import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Command, Heart, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAppStore } from "@/lib/atconiz/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listNotifications } from "@/lib/fn/engagement";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/studio", label: "Intelligence" },
  { to: "/market", label: "Markets" },
  { to: "/calculators", label: "Calculators" },
  { to: "/workspace", label: "Workspace" },
];

export function Header({ onCommand }: { onCommand: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    listNotifications()
      .then((r) => setUnread(r.unread))
      .catch(() => setUnread(0));
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Atconiz home">
          <span className="grid size-11 place-items-center rounded-md bg-accent text-lg font-semibold text-accent-fg">
            A
          </span>
          <span className="leading-tight">
            <span className="block font-display text-2xl tracking-tight">Atconiz</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.22em] text-muted sm:block">
              Intelligence redefined
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg",
                  active && "bg-bg-subtle text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCommand}
            className="hidden h-11 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted md:inline-flex"
            aria-label="Open command"
          >
            <Command className="size-4" />
            Search
          </button>
          <Link
            to="/workspace"
            search={{ tab: "saved" }}
            className="hidden size-11 place-items-center rounded-full border border-border sm:grid"
            aria-label="Saved homes"
          >
            <Heart className="size-4" />
          </Link>
          <Link
            to="/workspace"
            search={{ tab: "alerts" }}
            className="relative hidden size-11 place-items-center rounded-full border border-border sm:grid"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 ? (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />
            ) : null}
          </Link>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="grid size-11 place-items-center rounded-full border border-border"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {isPending ? (
            <div className="size-11 animate-pulse rounded-full bg-bg-subtle" />
          ) : (
            <>
              <SignedOut>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/login">Sign in</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          )}
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-border lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-border px-5 py-4 lg:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
