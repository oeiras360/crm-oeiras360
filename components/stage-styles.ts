import type { FunnelStage } from "@/types/crm";

export const stageStyles: Record<
  FunnelStage,
  { dot: string; active: string; hover: string; column: string }
> = {
  Lead: {
    dot: "bg-blue-500",
    active: "border-blue-300 bg-blue-50 text-blue-950 ring-blue-500/15",
    hover: "hover:border-blue-200 hover:bg-blue-50/70",
    column: "border-blue-200 bg-blue-50/40",
  },
  Contacted: {
    dot: "bg-amber-500",
    active: "border-amber-300 bg-amber-50 text-amber-950 ring-amber-500/15",
    hover: "hover:border-amber-200 hover:bg-amber-50/70",
    column: "border-amber-200 bg-amber-50/40",
  },
  Engaged: {
    dot: "bg-violet-500",
    active: "border-violet-300 bg-violet-50 text-violet-950 ring-violet-500/15",
    hover: "hover:border-violet-200 hover:bg-violet-50/70",
    column: "border-violet-200 bg-violet-50/40",
  },
  Negotiation: {
    dot: "bg-fuchsia-500",
    active: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950 ring-fuchsia-500/15",
    hover: "hover:border-fuchsia-200 hover:bg-fuchsia-50/70",
    column: "border-fuchsia-200 bg-fuchsia-50/40",
  },
  "Closed - Won": {
    dot: "bg-emerald-600",
    active: "border-emerald-300 bg-emerald-50 text-emerald-950 ring-emerald-500/15",
    hover: "hover:border-emerald-200 hover:bg-emerald-50/70",
    column: "border-emerald-200 bg-emerald-50/40",
  },
  "Closed - On Hold": {
    dot: "bg-neutral-500",
    active: "border-neutral-400 bg-neutral-100 text-neutral-950 ring-neutral-500/15",
    hover: "hover:border-neutral-300 hover:bg-neutral-100/80",
    column: "border-neutral-200 bg-neutral-100/50",
  },
  "Closed - Lost": {
    dot: "bg-red-500",
    active: "border-red-300 bg-red-50 text-red-950 ring-red-500/15",
    hover: "hover:border-red-200 hover:bg-red-50/70",
    column: "border-red-200 bg-red-50/40",
  },
};
