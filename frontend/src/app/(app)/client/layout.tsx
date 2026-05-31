"use client";

import { ClientGuard } from "@/components/auth/ClientGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientGuard>
      <AppShell title="Espace client">{children}</AppShell>
    </ClientGuard>
  );
}
