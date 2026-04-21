"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { HumanValidation, Ticket } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { AgentEventCard } from "@/components/AgentEventCard";
import { ValidationCard } from "@/components/ValidationCard";
import {
  formatEUR,
  relativeTime,
  slaRemaining,
} from "@/lib/format";

const POLL_INTERVAL_MS = 2000;

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [validation, setValidation] = useState<HumanValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOverride, setActingOverride] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await api.getTicket(id);
      setTicket(t);
      setError(null);
      if (t.human_validation_id) {
        try {
          const v = await api.getValidation(t.human_validation_id);
          setValidation(v);
        } catch {
          /* ignore transient */
        }
      } else {
        setValidation(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [id]);

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

  const override = async (action: "pause" | "take_over" | "resume") => {
    setActingOverride(true);
    try {
      await api.overrideTicket(id, { action });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur override");
    } finally {
      setActingOverride(false);
    }
  };

  if (!ticket && !error) {
    return <div className="text-neutral-500">Chargement…</div>;
  }

  if (error && !ticket) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
        Impossible de charger le ticket.
        <div className="mt-1 text-xs opacity-75">{error}</div>
        <Link
          href="/tickets"
          className="block mt-3 text-sm font-medium hover:underline"
        >
          ← Retour à la file
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  const sla = slaRemaining(ticket.order.sla_deadline);
  const canPause = ticket.status === "in_progress" || ticket.status === "pending";
  const canResume = ticket.status === "escalated";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tickets"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← File SAV
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ticket.customer.name}
            </h1>
            {ticket.customer.is_vip && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                VIP
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span className="font-mono">#{ticket.order.id}</span>
            <span>·</span>
            <TypeBadge type={ticket.type} />
            <StatusBadge status={ticket.status} />
            <span>·</span>
            <span>créé {relativeTime(ticket.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canPause && (
            <button
              onClick={() => override("pause")}
              disabled={actingOverride}
              className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={() => override("resume")}
              disabled={actingOverride}
              className="px-3 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50"
            >
              Reprendre
            </button>
          )}
          <button
            onClick={() => override("take_over")}
            disabled={actingOverride}
            className="px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
          >
            Prendre la main
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <Card title="Message client">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {ticket.raw_message}
            </p>
          </Card>

          {validation && (
            <Card title="Validation humaine">
              <ValidationCard validation={validation} onResolved={load} />
            </Card>
          )}

          <Card
            title="Timeline agents"
            subtitle={`${ticket.agent_events.length} événement${ticket.agent_events.length > 1 ? "s" : ""}`}
          >
            {ticket.agent_events.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Aucun événement pour le moment.
              </p>
            ) : (
              <div className="relative space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
                {ticket.agent_events.map((e) => (
                  <AgentEventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-6">
          <Card title="Client">
            <KV label="Nom" value={ticket.customer.name} />
            <KV label="Email" value={ticket.customer.email} mono />
            <KV
              label="Commandes"
              value={String(ticket.customer.order_count ?? 0)}
            />
            <KV
              label="VIP"
              value={ticket.customer.is_vip ? "Oui" : "Non"}
            />
          </Card>

          <Card title="Commande">
            <KV
              label="Montant"
              value={formatEUR(ticket.order.total_amount)}
              mono
            />
            <KV label="Statut" value={ticket.order.status} />
            <KV
              label="SLA"
              value={sla.label}
              valueClass={
                sla.overdue
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : undefined
              }
            />
            <KV label="Transporteur" value={ticket.order.shipping.carrier} />
            <KV
              label="Livraison"
              value={ticket.order.shipping.status}
            />
            {ticket.order.shipping.tracking_number && (
              <KV
                label="Tracking"
                value={ticket.order.shipping.tracking_number}
                mono
              />
            )}

            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              {ticket.order.items.map((it) => (
                <div
                  key={it.product_id}
                  className="flex items-start justify-between text-sm"
                >
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-neutral-500 font-mono">
                      #{it.product_id} · x{it.quantity}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums">
                    {formatEUR(it.unit_price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Résolution">
            <KV
              label="Score confiance"
              value={`${ticket.confidence_score}%`}
              mono
            />
            {ticket.resolution ? (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {ticket.resolution}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Pas encore de résolution.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && (
          <span className="text-xs text-neutral-500">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function KV({
  label,
  value,
  mono,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span
        className={`${mono ? "font-mono tabular-nums" : ""} ${valueClass ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
