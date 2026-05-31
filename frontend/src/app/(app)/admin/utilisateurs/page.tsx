"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserRole,
} from "@/lib/admin-api";
import { PASSWORD_MIN_LENGTH, passwordRequirementHint, validatePassword } from "@/lib/password-policy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";
const buttonPrimaryClass =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-50";
const buttonSecondaryClass =
  "rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-accent disabled:opacity-50";
const buttonDangerClass =
  "rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50";

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: AdminUserRole;
  enabled: boolean;
};

const emptyForm: UserForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "ROLE_CLIENT",
  enabled: true,
};

const roleOptions: { value: AdminUserRole; label: string }[] = [
  { value: "ROLE_CLIENT", label: "Client" },
  { value: "ROLE_PRODUCTEUR", label: "Producteur" },
  { value: "ROLE_SUPER_ADMIN", label: "Super admin" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadUsers(search = query, role = roleFilter) {
    const list = await fetchAdminUsers(search, role);
    setUsers(list);
  }

  useEffect(() => {
    loadUsers()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
    setInfo(null);
  }

  function openEditForm(user: AdminUser) {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      role: user.role as AdminUserRole,
      enabled: user.enabled,
    });
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loadUsers(query, roleFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    if (editingId !== null && form.password.trim() !== "") {
      const passwordError = validatePassword(form.password);
      if (passwordError) {
        setError(passwordError);
        setSaving(false);
        return;
      }
    }

    try {
      if (editingId === null) {
        const created = await createAdminUser({
          fullName: form.fullName.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          enabled: form.enabled,
        });
        setUsers((prev) =>
          [...prev, created].sort((a, b) =>
            (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "fr"),
          ),
        );
        setInfo(created.message ?? "Invitation envoyée par e-mail.");
      } else {
        const payload: {
          fullName: string;
          email: string;
          phone: string;
          role: AdminUserRole;
          enabled: boolean;
          password?: string;
        } = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          enabled: form.enabled,
        };
        if (form.password.trim() !== "") {
          payload.password = form.password;
        }
        const updated = await updateAdminUser(editingId, payload);
        setUsers((prev) =>
          prev
            .map((item) => (item.id === editingId ? updated : item))
            .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "fr")),
        );
      }
      if (editingId !== null) {
        closeForm();
      } else {
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(user: AdminUser) {
    setTogglingId(user.id);
    setError(null);
    try {
      const updated = await updateAdminUser(user.id, { enabled: !user.enabled });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(user: AdminUser) {
    const label = user.fullName ?? user.email;
    if (!window.confirm(`Supprimer l'utilisateur « ${label} » ?`)) {
      return;
    }

    setDeletingId(user.id);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      if (editingId === user.id) {
        closeForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Utilisateurs</h2>
          <p className="mt-1 text-sm text-foreground/65">
            Clients, producteurs et administrateurs.
          </p>
        </div>
        <button type="button" onClick={openCreateForm} className={buttonPrimaryClass}>
          Ajouter
        </button>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par nom, e-mail ou téléphone"
          className={`${inputClass} mt-0`}
        />
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className={`${inputClass} mt-0 flex-1`}
          >
            <option value="">Tous les rôles</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonSecondaryClass}>
            OK
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {info && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</p>
      )}

      {formOpen && (
        <section className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-primary">
            {editingId === null ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className={labelClass}>
              Nom
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              E-mail
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Téléphone
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Rôle
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value as AdminUserRole }))
                }
                className={inputClass}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {editingId === null ? (
              <p className="text-sm text-foreground/60">
                Un e-mail sera envoyé avec un lien pour créer le mot de passe (valable 7 jours).
              </p>
            ) : (
              <label className={labelClass}>
                Mot de passe (laisser vide pour ne pas changer)
                <input
                  type="password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className={inputClass}
                />
                <span className="mt-1 block text-xs text-foreground/50">{passwordRequirementHint()}</span>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/20"
              />
              Compte actif
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className={buttonPrimaryClass}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button type="button" onClick={closeForm} className={buttonSecondaryClass}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <PageLoader size="sm" />
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucun utilisateur trouvé.
        </p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">{user.fullName ?? "Sans nom"}</p>
                  <p className="truncate text-sm text-foreground/65">{user.email}</p>
                  {user.phone && <p className="text-sm text-foreground/55">{user.phone}</p>}
                  <p className="mt-1 text-xs text-foreground/45">{user.roleLabel}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                    user.enabled
                      ? user.pendingPasswordSetup
                        ? "bg-amber-50 text-amber-900"
                        : "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {!user.enabled
                    ? "Désactivé"
                    : user.pendingPasswordSetup
                      ? "Invitation en attente"
                      : "Actif"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.role === "ROLE_CLIENT" && (
                  <Link
                    href={`/admin/clients/${user.id}/commandes`}
                    className={buttonSecondaryClass}
                  >
                    Commandes
                  </Link>
                )}
                <button type="button" onClick={() => openEditForm(user)} className={buttonSecondaryClass}>
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={togglingId === user.id}
                  onClick={() => toggleEnabled(user)}
                  className={buttonSecondaryClass}
                >
                  {togglingId === user.id ? "…" : user.enabled ? "Désactiver" : "Activer"}
                </button>
                <button
                  type="button"
                  disabled={deletingId === user.id}
                  onClick={() => handleDelete(user)}
                  className={buttonDangerClass}
                >
                  {deletingId === user.id ? "…" : "Supprimer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
