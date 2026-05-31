"use client";

import { PanioLogo } from "@/components/brand/PanioLogo";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { getNavItems } from "@/lib/roles";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, role, logout } = useAuth();
  const { isNavigating } = useNavigation();
  const navItems = getNavItems(role);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <PanioLogo size={44} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-primary-light">Panio</p>
              {title ? (
                <h1 className="truncate text-lg font-semibold text-primary">{title}</h1>
              ) : role === "super_admin" ? (
                <h1 className="truncate text-lg font-semibold text-primary">Administration</h1>
              ) : (
                <h1 className="truncate text-lg font-semibold text-primary">Espace producteur</h1>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent"
          >
            Se déconnecter
          </button>
        </div>
        {user && (
          <p className="mx-auto mt-1 max-w-lg truncate text-xs text-foreground/50">
            {user.fullName ? `${user.fullName} · ${user.email}` : user.email}
          </p>
        )}
      </header>

      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        {isNavigating && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/70 pt-12 backdrop-blur-[2px]">
            <PageLoader size="sm" />
          </div>
        )}
        {children}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
