"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { History, LayoutGrid, Menu, Receipt, Server, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
};

function isLinkActive(pathname: string, href: string, matchPrefix?: string) {
  if (href === "/") return pathname === "/";
  if (matchPrefix) {
    return pathname === href || pathname.startsWith(`${matchPrefix}/`);
  }
  return pathname === href;
}

function NavItem({
  link,
  pathname,
  onNavigate,
}: {
  link: NavLink;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isLinkActive(pathname, link.href, link.matchPrefix);
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-zinc-900" : "text-zinc-400")} />
      {link.label}
    </Link>
  );
}

const mainLinks: NavLink[] = [
  { href: "/", label: "Wizard", icon: Sparkles },
  { href: "/instances", label: "Instances", icon: Server },
  { href: "/history", label: "History", icon: History },
  { href: "/billing", label: "Billing", icon: Receipt, matchPrefix: "/billing" },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/billing", label: "Invoices", icon: Receipt, matchPrefix: "/admin/billing" },
];

export function AppShell({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [signingOut, setSigningOut] = useState(false);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/sign-out", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Sign out failed");
      }
    } catch {
      // Force navigation so user can sign in again.
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="min-h-screen bg-white md:flex">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Plane Automation
            </p>
            <h1 className="mt-0.5 text-base font-semibold text-zinc-950">Task Builder</h1>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {mainLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}

          {isAdmin ? (
            <div className="pt-4">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Admin
              </p>
              <div className="space-y-1">
                {adminLinks.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          <Button
            variant="outline"
            className="w-full text-zinc-600"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-zinc-950">Task Builder</p>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
