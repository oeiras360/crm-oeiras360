import type { FunnelStage } from "@/types/crm";

const styles: Record<FunnelStage, string> = {
  Lead: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Contacted: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Engaged: "bg-violet-50 text-violet-700 ring-violet-600/20",
  Negotiation: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20",
  "Closed - Won": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Closed - On Hold": "bg-neutral-100 text-neutral-700 ring-neutral-500/20",
  "Closed - Lost": "bg-red-50 text-red-700 ring-red-600/20",
};

export function StatusBadge({ status }: { status: FunnelStage }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}
