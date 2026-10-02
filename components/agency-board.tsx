"use client";

import { useState, useTransition } from "react";
import { updateAgencyStageAction } from "@/app/agencias/actions";
import { isAgencyOverdue } from "@/components/agency-activity";
import { agencyStageStyles } from "@/components/stage-styles";
import { useToast } from "@/components/toast";
import {
  AGENCY_STAGES,
  AGENCY_STAGE_LABELS,
  type Agency,
  type AgencyStage,
} from "@/types/crm";

export function AgencyBoard({
  agencies,
  onSelectAgency,
  onAgencyUpdated,
}: {
  agencies: Agency[];
  onSelectAgency: (agency: Agency) => void;
  onAgencyUpdated: (agency: Agency) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<AgencyStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleDrop(stage: AgencyStage) {
    const agency = agencies.find((item) => item.id === draggingId);
    setDropStage(null);
    setDraggingId(null);
    if (!agency || agency.funnel_stage === stage) return;

    const previous = agency;
    // Optimistic move; revert if the server rejects it.
    onAgencyUpdated({ ...agency, funnel_stage: stage });
    setError(null);
    startTransition(async () => {
      const result = await updateAgencyStageAction(agency.id, stage);
      if (!result.data) {
        onAgencyUpdated(previous);
        setError(result.error);
        showToast(`Could not move ${agency.company_name}`, "error");
        return;
      }
      onAgencyUpdated(result.data);
      showToast(
        stage === "acordo"
          ? `Acordo com ${agency.company_name} 🎉`
          : `${agency.company_name} moved to ${AGENCY_STAGE_LABELS[stage]}`,
      );
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
        {AGENCY_STAGES.map((stage) => {
          const stageAgencies = agencies.filter((agency) => agency.funnel_stage === stage);
          const styles = agencyStageStyles[stage];
          const isDropTarget = dropStage === stage;
          const label = AGENCY_STAGE_LABELS[stage];

          return (
            <section
              key={stage}
              aria-label={`${label} column`}
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
                  <span className="text-xs font-semibold text-neutral-800">{label}</span>
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600">
                  {stageAgencies.length}
                </span>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {stageAgencies.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-neutral-400">
                    Drop an agency here
                  </p>
                )}
                {stageAgencies.map((agency) => (
                  <article
                    key={agency.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(agency.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropStage(null);
                    }}
                    onClick={() => onSelectAgency(agency)}
                    className={`cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md active:cursor-grabbing ${
                      draggingId === agency.id ? "opacity-40" : ""
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {agency.company_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">{agency.contact_name}</p>
                    {(agency.tags.length > 0 || isAgencyOverdue(agency)) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {isAgencyOverdue(agency) && (
                          <span
                            className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                            title={agency.next_action_note ?? "Follow-up overdue"}
                          >
                            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                            Overdue
                          </span>
                        )}
                        {agency.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {agency.tags.length > 2 && (
                          <span className="text-[10px] text-neutral-400">
                            +{agency.tags.length - 2}
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
