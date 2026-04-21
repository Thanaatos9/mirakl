import type { TicketStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/format";

const STYLES: Record<TicketStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  awaiting_human:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  escalated:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  resolved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
