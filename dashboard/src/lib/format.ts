import type { TicketStatus, TicketType } from "./types";

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `il y a ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.round(h / 24);
  return `il y a ${days} j`;
}

export function slaRemaining(iso: string): { label: string; overdue: boolean } {
  const d = new Date(iso).getTime();
  const diffMs = d - Date.now();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const base = h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}m`;
  return { label: overdue ? `dépassé de ${base}` : `reste ${base}`, overdue };
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  awaiting_human: "Attente validation",
  escalated: "Escaladé",
  resolved: "Résolu",
};

export const TYPE_LABELS: Record<TicketType, string> = {
  unshipped: "Non expédié",
  not_received: "Non reçu",
  defective: "Défectueux",
  cancellation: "Annulation",
  return: "Retour",
  unknown: "Inconnu",
};
