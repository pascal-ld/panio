import { AdminGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AppShell>{children}</AppShell>
    </AdminGuard>
  );
}
