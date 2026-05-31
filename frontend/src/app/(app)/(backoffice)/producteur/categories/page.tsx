"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from "@/lib/producteur-api";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";

export default function ProducteurCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadCategories() {
    const list = await fetchCategories();
    setCategories(list);
  }

  useEffect(() => {
    loadCategories()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleSaveEdit(categoryId: number) {
    const name = editName.trim();
    if (!name) return;

    setSavingId(categoryId);
    setError(null);
    try {
      const updated = await updateCategory(categoryId, name);
      setCategories((prev) =>
        prev
          .map((c) => (c.id === categoryId ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(category: Category) {
    const count = category.productCount ?? 0;
    const message =
      count > 0
        ? `Supprimer « ${category.name} » ? Les ${count} produit(s) associé(s) n'auront plus de catégorie.`
        : `Supprimer la catégorie « ${category.name} » ?`;

    if (!window.confirm(message)) {
      return;
    }

    setDeletingId(category.id);
    setError(null);
    try {
      await deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-primary">Mes catégories</h2>
        <Link
          href="/producteur/produits"
          className="text-sm font-medium text-primary hover:underline"
        >
          Mes produits
        </Link>
      </div>

      <p className="text-sm text-foreground/65">
        Créez vos propres catégories pour organiser votre catalogue. La catégorie est optionnelle
        pour chaque produit.
      </p>

      <form onSubmit={handleCreate} className="rounded-2xl border border-primary/15 bg-white p-4">
        <label className={labelClass}>
          Nouvelle catégorie
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
            placeholder="Ex. Légumes"
            maxLength={100}
          />
        </label>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {loading && <PageLoader size="sm" />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!loading && categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-primary/25 bg-white p-6 text-center text-sm text-foreground/60">
          Aucune catégorie. Ajoutez-en une ci-dessus.
        </p>
      )}

      <ul className="space-y-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm"
          >
            {editingId === category.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputClass}
                  maxLength={100}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(category.id)}
                    disabled={savingId === category.id || !editName.trim()}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingId === category.id ? "…" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-medium text-primary"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{category.name}</p>
                  {(category.productCount ?? 0) > 0 && (
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {category.productCount} produit{(category.productCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(category)}
                    className="rounded-lg border border-primary/20 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={deletingId === category.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-60"
                  >
                    {deletingId === category.id ? "…" : "Supprimer"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
