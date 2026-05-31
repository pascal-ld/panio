"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";

export function ClientGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["client", "producteur", "super_admin"]}>{children}</RoleGuard>;
}
