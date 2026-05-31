import type { MeResponse } from "@/lib/api";

export type AppRole = "visitor" | "client" | "producteur" | "super_admin";

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "plus" | "list" | "settings" | "shop" | "harvest" | "user" | "history" | "users";
};

export function resolveAppRole(user: MeResponse | null): AppRole {
  if (!user?.role) {
    return "visitor";
  }

  if (user.roles.includes("ROLE_SUPER_ADMIN")) {
    return "super_admin";
  }
  if (user.roles.includes("ROLE_PRODUCTEUR")) {
    return "producteur";
  }
  if (user.roles.includes("ROLE_CLIENT")) {
    return "client";
  }

  return "visitor";
}

export function getHomePath(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "/admin/producteurs";
    case "producteur":
      return "/producteur";
    case "client":
      return "/client";
    default:
      return "/";
  }
}

export function getNavItems(role: AppRole): NavItem[] {
  switch (role) {
    case "super_admin":
      return [
        { href: "/admin/producteurs", label: "Producteurs", icon: "shop" },
        { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "users" },
        { href: "/admin/compte", label: "Compte", icon: "user" },
      ];
    case "producteur":
      return [
        { href: "/producteur", label: "Accueil", icon: "home" },
        { href: "/producteur/commandes", label: "Commandes", icon: "list" },
        { href: "/producteur/recolte", label: "Récolte", icon: "harvest" },
        { href: "/producteur/parametres", label: "Réglages", icon: "settings" },
      ];
    case "client":
      return [
        { href: "/client", label: "Accueil", icon: "home" },
        { href: "/client/commandes", label: "Commandes", icon: "list" },
        { href: "/client/producteurs", label: "Producteurs", icon: "shop" },
        { href: "/client/profil", label: "Profil", icon: "user" },
      ];
    default:
      return [];
  }
}

export function canAccessProducteur(role: AppRole): boolean {
  return role === "producteur" || role === "super_admin";
}

export function canAccessAdmin(role: AppRole): boolean {
  return role === "super_admin";
}
