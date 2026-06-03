"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  createAdminProducer,
  fetchAdminProducers,
  updateAdminProducer,
  type AdminProducer,
} from "@/lib/admin-api";
import { PASSWORD_MIN_LENGTH, passwordRequirementHint, validatePassword } from "@/lib/password-policy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";
const buttonPrimaryClass =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-50";
const buttonSecondaryClass =
  "rounded-xl border border-primary/20 px-4 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-accent disabled:opacity-50";

type ProducerForm = {
  fullName: string;
  email: string;
  password: string;
  enabled: boolean;
};

const emptyForm: ProducerForm = {
  fullName: "",
  email: "",
  password: "",
  enabled: true,
};

export default function AdminProducersPage() {
  const [producers, setProducers] = useState<AdminProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProducerForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadProducers = useCallback(async (search: string) => {
    const list = await fetchAdminProducers(search);
    setProducers(list);
  }, []);

  useEffect(() => {
    loadProducers("")
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadProducers]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
    setInfo(null);
  }

  function openEditForm(producer: AdminProducer) {
    setEditingId(producer.id);
    setForm({
      fullName: producer.fullName ?? "",
      email: producer.email,
      password: "",
      enabled: producer.enabled,
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
      await loadProducers(query);
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
        const created = await createAdminProducer({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          enabled: form.enabled,
        });
        setProducers((prev) =>
          [...prev, created].sort((a, b) =>
            (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "fr"),
          ),
        );
        setInfo(created.message ?? "Invitation envoyée par e-mail.");
      } else {
        const payload: {
          fullName: string;
          email: string;
          enabled: boolean;
          password?: string;
        } = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          enabled: form.enabled,
        };
        if (form.password.trim() !== "") {
          payload.password = form.password;
        }
        const updated = await updateAdminProducer(editingId, payload);
        setProducers((prev) =>
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

  async function toggleEnabled(producer: AdminProducer) {
    setTogglingId(producer.id);
    setError(null);
    try {
      const updated = await updateAdminProducer(producer.id, { enabled: !producer.enabled });
      setProducers((prev) => prev.map((item) => (item.id === producer.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Producteurs</h2>
          <p className="mt-1 text-sm text-foreground/65">Créer et gérer les comptes producteurs.</p>
        </div>
        <button type="button" onClick={openCreateForm} className={buttonPrimaryClass}>
          Ajouter
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par nom ou e-mail"
          className={`${inputClass} mt-0`}
        />
        <button type="submit" className={buttonSecondaryClass}>
          OK
        </button>
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
            {editingId === null ? "Nouveau producteur" : "Modifier le producteur"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className={labelClass}>
              Nom
              <input
                type="text"
                required
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
            {editingId === null ? (
              <p className="text-sm text-foreground/60">
                Un e-mail sera envoyé à cette adresse avec un lien pour créer le mot de passe (valable 7 jours).
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
            <div className="flex gap-2">
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
      ) : producers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucun producteur trouvé.
        </p>
      ) : (
        <ul className="space-y-3">
          {producers.map((producer) => (
            <li
              key={producer.id}
              className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">{producer.fullName ?? "Sans nom"}</p>
                  <p className="truncate text-sm text-foreground/65">{producer.email}</p>
                  {producer.slug && (
                    <p className="mt-1 text-xs text-foreground/45">Boutique : /producteur/{producer.slug}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                    producer.enabled
                      ? producer.pendingPasswordSetup
                        ? "bg-amber-50 text-amber-900"
                        : "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {!producer.enabled
                    ? "Désactivé"
                    : producer.pendingPasswordSetup
                      ? "Invitation en attente"
                      : "Actif"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => openEditForm(producer)} className={buttonSecondaryClass}>
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={togglingId === producer.id}
                  onClick={() => toggleEnabled(producer)}
                  className={buttonSecondaryClass}
                >
                  {togglingId === producer.id
                    ? "…"
                    : producer.enabled
                      ? "Désactiver"
                      : "Activer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
