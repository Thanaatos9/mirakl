"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HumanValidation, ValidationStatus } from "@/lib/types";
import { ValidationCard } from "@/components/ValidationCard";

const POLL_INTERVAL_MS = 3000;

const FILTERS: Array<{ value: ValidationStatus; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvées" },
  { value: "rejected", label: "Refusées" },
];

export default function ValidationsPage() {
  const [filter, setFilter] = useState<ValidationStatus>("pending");
  const [items, setItems] = useState<HumanValidation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listValidations(filter);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!cancelled) await load();
    };
    tick();
    const iv = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Validations</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Remboursements qui requièrent ton approbation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresh {POLL_INTERVAL_MS / 1000}s
        </div>
      </header>

      <div className="flex items-center gap-1.5 text-xs">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={
                "px-3 py-1.5 rounded-md transition-colors " +
                (active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
          <strong>Backend injoignable.</strong>
          <div className="mt-1 text-xs opacity-75">{error}</div>
        </div>
      )}

      {items === null && !error && (
        <div className="text-sm text-neutral-500">Chargement…</div>
      )}

      {items !== null && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          {filter === "pending"
            ? "Aucune validation en attente. Tout roule."
            : "Rien à afficher."}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items?.map((v) => (
          <ValidationCard key={v.id} validation={v} onResolved={load} />
        ))}
      </div>
    </div>
  );
}
