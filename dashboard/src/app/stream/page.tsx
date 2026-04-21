"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { subscribeToStream } from "@/lib/api";
import type { AgentEvent } from "@/lib/types";
import { AgentBadge } from "@/components/AgentBadge";
import { relativeTime } from "@/lib/format";

const MAX_BUFFER = 200;

const AGENT_FILTERS = [
  "all",
  "orchestrator",
  "shipping",
  "delivery",
  "defect",
  "return",
  "cancellation",
  "human",
] as const;

type ConnStatus = "connecting" | "live" | "error";

export default function StreamPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [paused, setPaused] = useState(false);
  const [agentFilter, setAgentFilter] = useState<(typeof AGENT_FILTERS)[number]>(
    "all"
  );
  const [receivedSincePause, setReceivedSincePause] = useState(0);

  // Ring-buffer in a ref so closures see the latest.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const unsubscribe = subscribeToStream(
      (ev) => {
        setStatus("live");
        if (pausedRef.current) {
          setReceivedSincePause((n) => n + 1);
          return;
        }
        setEvents((prev) => {
          const next = [ev, ...prev];
          return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
        });
      },
      () => setStatus("error")
    );
    return unsubscribe;
  }, []);

  // When resuming, reset the counter.
  useEffect(() => {
    if (!paused) setReceivedSincePause(0);
  }, [paused]);

  const filtered = useMemo(() => {
    if (agentFilter === "all") return events;
    return events.filter((e) => e.agent === agentFilter);
  }, [events, agentFilter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flux Live</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Tous les événements agents, en direct.
          </p>
        </div>
        <ConnectionBadge status={status} />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-500 mr-1">Agent</span>
          {AGENT_FILTERS.map((a) => {
            const active = a === agentFilter;
            return (
              <button
                key={a}
                onClick={() => setAgentFilter(a)}
                className={
                  "px-2.5 py-1 rounded-md transition-colors " +
                  (active
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800")
                }
              >
                {a === "all" ? "Tous" : a}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className={
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
              (paused
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800")
            }
          >
            {paused ? `Reprendre${receivedSincePause > 0 ? ` (+${receivedSincePause})` : ""}` : "Pause"}
          </button>
          <button
            onClick={() => setEvents([])}
            className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Effacer
          </button>
        </div>
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
          <strong>Connexion SSE perdue.</strong> Tentative de reconnexion
          automatique. Vérifie que le backend tourne sur le port 8000.
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            {status === "connecting" && "Connexion au flux…"}
            {status === "live" && events.length === 0 && "En attente d'événements. Lance un scénario démo pour voir quelque chose."}
            {status === "live" && events.length > 0 && "Aucun événement ne correspond au filtre."}
            {status === "error" && "Aucun événement reçu."}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((e, i) => (
              <EventRow key={e.id} event={e} isNew={i === 0 && !paused} />
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-neutral-500 text-right">
        Buffer : {events.length} / {MAX_BUFFER} événements
      </div>
    </div>
  );
}

function EventRow({ event, isNew }: { event: AgentEvent; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = event.data && Object.keys(event.data).length > 0;

  return (
    <li
      className={
        "px-4 py-3 transition-colors " +
        (isNew
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 animate-[fadeIn_0.5s_ease-out]"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40")
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            event.requires_human
              ? "bg-amber-500"
              : event.agent === "human"
              ? "bg-neutral-900 dark:bg-neutral-100"
              : "bg-emerald-500"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <AgentBadge agent={event.agent} />
            <span className="font-mono text-neutral-600 dark:text-neutral-400">
              {event.action}
            </span>
            <Link
              href={`/tickets/${event.ticket_id}`}
              className="font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:underline"
            >
              #{event.ticket_id.slice(0, 8)}
            </Link>
            <span className="ml-auto text-neutral-400">
              {relativeTime(event.timestamp)}
            </span>
          </div>
          <p
            className={
              "mt-1 text-sm text-neutral-700 dark:text-neutral-300 " +
              (expanded ? "" : "line-clamp-2")
            }
          >
            {event.reasoning}
          </p>
          {(hasData || event.reasoning.length > 140) && (
            <button
              onClick={() => setExpanded((x) => !x)}
              className="mt-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              {expanded ? "Réduire" : "Détails"}
            </button>
          )}
          {expanded && hasData && (
            <pre className="mt-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950/60 rounded p-2 overflow-x-auto">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          )}
          {event.requires_human && (
            <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              ⚠ Validation humaine requise
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ConnectionBadge({ status }: { status: ConnStatus }) {
  const { dot, label } =
    status === "live"
      ? { dot: "bg-emerald-500 animate-pulse", label: "Connecté" }
      : status === "connecting"
      ? { dot: "bg-amber-500 animate-pulse", label: "Connexion…" }
      : { dot: "bg-red-500", label: "Déconnecté" };
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
