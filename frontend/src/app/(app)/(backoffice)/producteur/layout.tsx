"use client";

import { ProducteurGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function ProducteurLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProducteurGuard>
      <AppShell>{children}</AppShell>
    </ProducteurGuard>
  );
}
