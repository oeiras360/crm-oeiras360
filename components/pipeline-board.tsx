"use client";

import { useState, useTransition } from "react";
import { updateLeadFunnelAction } from "@/app/pipeline/actions";
import { isOverdue } from "@/components/lead-activity";
import { stageStyles } from "@/components/stage-styles";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

export function PipelineBoard({
  leads,
  onSelectLead,
  onLeadUpdated,
}: {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onLeadUpdated: (lead: Lead) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<FunnelStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(stage: FunnelStage) {
    const lead = leads.find((item) => item.id === draggingId);
    setDropStage(null);
    setDraggingId(null);
    if (!lead || lead.funnel_stage === stage) return;

    const previous = lead;
    // Optimistic move; revert if the server rejects it.
    onLeadUpdated({ ...lead, funnel_stage: stage });
    setError(null);
    startTransition(async () => {
      const result = await updateLeadFunnelAction(lead.id, stage);
      if (!result.data) {
        onLeadUpdated(previous);
        setError(result.error);
        return;
      }
      onLeadUpdated(result.data);
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {FUNNEL_STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.funnel_stage === stage);
          const styles = stageStyles[stage];
          const isDropTarget = dropStage === stage;

          return (
            <section
              key={stage}
              aria-label={`${stage} column`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dropStage !== stage) setDropStage(stage);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDropStage((current) => (current === stage ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(stage);
              }}
              className={`flex max-h-[72vh] w-72 shrink-0 flex-col rounded-xl border transition-colors ${
                isDropTarget
                  ? `${styles.column} border-2 border-dashed`
                  : "border-border bg-surface"
              }`}
            >
              <header className="flex items-center justify-between gap-2 px-3 py-3">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`size-2 rounded-full ${styles.dot}`} />
                  <span className="text-xs font-semibold text-neutral-800">{stage}</span>
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600">
                  {stageLeads.length}
                </span>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {stageLeads.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-neutral-400">
                    Drop a lead here
                  </p>
                )}
                {stageLeads.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(lead.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropStage(null);
                    }}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md active:cursor-grabbing ${
                      draggingId === lead.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-neutral-950">
                        {lead.company_name}
                      </p>
                      {lead.lead_score !== null && (
                        <span className="shrink-0 font-mono text-xs font-semibold text-neutral-500">
                          {lead.lead_score.toLocaleString("pt-PT")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">{lead.contact_name}</p>
                    {(lead.tags.length > 0 || isOverdue(lead)) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {isOverdue(lead) && (
                          <span
                            className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                            title={lead.next_action_note ?? "Follow-up overdue"}
                          >
                            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                            Overdue
                          </span>
                        )}
                        {lead.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="text-[10px] text-neutral-400">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
