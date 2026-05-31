"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}
