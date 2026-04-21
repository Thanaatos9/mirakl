"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Ticket, TicketStatus, TicketType } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeBadge } from "@/components/TypeBadge";
import {
  STATUS_LABELS,
  TYPE_LABELS,
  formatEUR,
  relativeTime,
  slaRemaining,
} from "@/lib/format";

const STATUS_FILTERS: Array<TicketStatus | "all"> = [
  "all",
  "pending",
  "in_progress",
  "awaiting_human",
  "escalated",
  "resolved",
];

const TYPE_FILTERS: Array<TicketType | "all"> = [
  "all",
  "unshipped",
  "not_received",
  "defective",
  "cancellation",
  "return",
  "unknown",
];

const POLL_INTERVAL_MS = 3000;

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [type, setType] = useState<TicketType | "all">("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api.listTickets({ limit: 100 });
        if (!cancelled) {
          setTickets(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur inconnue");
        }
      }
    };

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(
      (t) =>
        (status === "all" || t.status === status) &&
        (type === "all" || t.type === type)
    );
  }, [tickets, status, type]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets?.length ?? 0 };
    for (const t of tickets ?? []) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">File SAV</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {tickets === null
              ? "Chargement…"
              : `${filtered.length} ticket${filtered.length > 1 ? "s" : ""} affiché${filtered.length > 1 ? "s" : ""} sur ${tickets.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresh {POLL_INTERVAL_MS / 1000}s
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
          <strong>Backend injoignable.</strong> Vérifie qu&apos;il tourne
          (<code className="font-mono">uvicorn main:app --reload</code> dans{" "}
          <code className="font-mono">backend/</code>).
          <div className="mt-1 text-xs opacity-75">{error}</div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Statut"
          value={status}
          onChange={(v) => setStatus(v as TicketStatus | "all")}
          options={STATUS_FILTERS.map((s) => ({
            value: s,
            label: s === "all" ? "Tous" : STATUS_LABELS[s],
            count: counts[s],
          }))}
        />
        <FilterGroup
          label="Type"
          value={type}
          onChange={(v) => setType(v as TicketType | "all")}
          options={TYPE_FILTERS.map((t) => ({
            value: t,
            label: t === "all" ? "Tous" : TYPE_LABELS[t],
          }))}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Client</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Statut</th>
              <th className="px-4 py-2.5 text-left font-medium">Montant</th>
              <th className="px-4 py-2.5 text-left font-medium">SLA</th>
              <th className="px-4 py-2.5 text-left font-medium">Créé</th>
              <th className="px-4 py-2.5 text-right font-medium">Confiance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {tickets === null && (
              <SkeletonRows />
            )}
            {tickets !== null && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-neutral-500"
                >
                  {tickets.length === 0
                    ? "Aucun ticket pour le moment."
                    : "Aucun ticket ne correspond aux filtres."}
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const sla = slaRemaining(t.order.sla_deadline);
              return (
                <tr
                  key={t.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.customer.name}
                      {t.customer.is_vip && (
                        <span className="ml-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          VIP
                        </span>
                      )}
                    </Link>
                    <div className="text-xs text-neutral-500 font-mono">
                      #{t.order.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={t.type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatEUR(t.order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        sla.overdue
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-neutral-600 dark:text-neutral-400"
                      }
                    >
                      {sla.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {relativeTime(t.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                    {t.confidence_score}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-neutral-500 mr-1">{label}</span>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              "px-2.5 py-1 rounded-md transition-colors " +
              (active
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800")
            }
          >
            {o.label}
            {typeof o.count === "number" && (
              <span className={"ml-1.5 opacity-60"}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
