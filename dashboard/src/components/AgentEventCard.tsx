import type { AgentEvent } from "@/lib/types";
import { AgentBadge } from "./AgentBadge";
import { relativeTime } from "@/lib/format";

export function AgentEventCard({ event }: { event: AgentEvent }) {
  return (
    <div className="relative pl-6">
      <span
        className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-white dark:ring-neutral-950 ${
          event.requires_human
            ? "bg-amber-500"
            : event.agent === "human"
            ? "bg-neutral-900 dark:bg-neutral-100"
            : "bg-emerald-500"
        }`}
      />
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <AgentBadge agent={event.agent} />
          <span className="font-mono text-neutral-600 dark:text-neutral-400">
            {event.action}
          </span>
          <span className="ml-auto">{relativeTime(event.timestamp)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {event.reasoning}
        </p>
        {event.data && Object.keys(event.data).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300">
              Données ({Object.keys(event.data).length})
            </summary>
            <pre className="mt-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950/60 rounded p-2 overflow-x-auto">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </details>
        )}
        {event.requires_human && (
          <div className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            ⚠ Validation humaine requise
          </div>
        )}
      </div>
    </div>
  );
}
