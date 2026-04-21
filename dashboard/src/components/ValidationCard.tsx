"use client";

import { useState } from "react";
import type { HumanValidation } from "@/lib/types";
import { api } from "@/lib/api";
import { formatEUR, relativeTime } from "@/lib/format";

export function ValidationCard({
  validation,
  onResolved,
}: {
  validation: HumanValidation;
  onResolved?: () => void;
}) {
  const [adjusted, setAdjusted] = useState<string>(
    validation.amount.toFixed(2)
  );
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resolved = validation.status !== "pending";

  const approve = async () => {
    setBusy(true);
    setErr(null);
    try {
      const amt = parseFloat(adjusted);
      await api.approveValidation(validation.id, {
        approved_amount: Number.isFinite(amt) ? amt : undefined,
      });
      onResolved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setErr("Raison obligatoire.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.rejectValidation(validation.id, { reason: reason.trim() });
      onResolved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-500">
            Ticket #{validation.ticket_id.slice(0, 8)} · {relativeTime(validation.created_at)}
          </div>
          <div className="mt-1 text-lg font-semibold">
            {formatEUR(validation.amount)}
          </div>
          <div className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {validation.reason}
          </div>
        </div>
        {resolved && (
          <span
            className={
              "text-xs font-medium px-2 py-0.5 rounded-md " +
              (validation.status === "approved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300")
            }
          >
            {validation.status === "approved"
              ? `Approuvé ${validation.approved_amount ? formatEUR(validation.approved_amount) : ""}`
              : "Refusé"}
          </span>
        )}
      </div>

      <div className="rounded-md bg-neutral-50 dark:bg-neutral-950/60 p-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 border-l-2 border-indigo-400">
        <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-1">
          Raisonnement de l&apos;agent
        </div>
        {validation.agent_reasoning}
      </div>

      {!resolved && (
        <div className="space-y-2">
          {mode === "idle" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500 flex items-center gap-2">
                Montant
                <input
                  type="number"
                  step="0.01"
                  value={adjusted}
                  onChange={(e) => setAdjusted(e.target.value)}
                  className="w-24 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono tabular-nums text-sm text-right"
                />
                €
              </label>
              <button
                onClick={approve}
                disabled={busy}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Approuver
              </button>
              <button
                onClick={() => setMode("reject")}
                disabled={busy}
                className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-2">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Raison du refus…"
                className="w-full px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={reject}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmer le refus
                </button>
                <button
                  onClick={() => {
                    setMode("idle");
                    setReason("");
                    setErr(null);
                  }}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {err && (
            <div className="text-xs text-red-600 dark:text-red-400">{err}</div>
          )}
        </div>
      )}
    </div>
  );
}
