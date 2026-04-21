import type { TicketType } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/format";

const STYLES: Record<TicketType, string> = {
  unshipped: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  not_received: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  defective: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  cancellation: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  return: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  unknown: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function TypeBadge({ type }: { type: TicketType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STYLES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}
