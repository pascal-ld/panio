"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { getHomePath, type AppRole } from "@/lib/roles";

export function RoleGuard({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: AppRole[];
}) {
  const { role, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(role)) {
      router.replace(getHomePath(role));
    }
  }, [allowedRoles, loading, role, router, user]);

  if (loading || !user || !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return <>{children}</>;
}

export function ProducteurGuard({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["producteur", "super_admin"]}>{children}</RoleGuard>;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["super_admin"]}>{children}</RoleGuard>;
}
