"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Wizard" },
  { href: "/instances", label: "Instances" },
  { href: "/history", label: "History" },
  { href: "/billing", label: "Billing" },
];

function SidebarNav({
  visibleLinks,
  pathname,
  onNavigate,
}: {
  visibleLinks: Array<{ href: string; label: string }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {visibleLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === link.href
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

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

  const visibleLinks = isAdmin
    ? [...links, { href: "/admin", label: "Admin" }]
    : links;

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
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Plane Automation
            </p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-950">Task Builder</h1>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav
          visibleLinks={visibleLinks}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className="border-t border-zinc-200 p-4">
          <Button
            variant="outline"
            className="w-full"
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
