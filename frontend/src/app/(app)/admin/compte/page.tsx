"use client";

import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminAccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">Mon compte</h2>
        <p className="mt-1 text-sm text-foreground/65">
          {user?.fullName ? `${user.fullName} · ${user.email}` : user?.email}
        </p>
      </div>

      <section className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-primary">Changer le mot de passe</h3>
        <p className="mt-1 text-sm text-foreground/60">
          Votre mot de passe actuel est requis pour confirmer le changement.
        </p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-4 rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-accent"
        >
          Se déconnecter
        </button>
      </section>
    </div>
  );
}
