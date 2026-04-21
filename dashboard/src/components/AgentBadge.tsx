const STYLES: Record<string, string> = {
  orchestrator:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  shipping:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  delivery:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  defect:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  return:
    "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  cancellation:
    "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  human:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const FALLBACK =
  "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

export function AgentBadge({ agent }: { agent: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono ${STYLES[agent] ?? FALLBACK}`}
    >
      {agent}
    </span>
  );
}
