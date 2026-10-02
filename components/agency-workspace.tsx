"use client";

import { useEffect, useMemo, useState } from "react";
import { AgencyBoard } from "@/components/agency-board";
import { AgencyDetailsModal } from "@/components/agency-details-modal";
import { AgencyFormDrawer } from "@/components/agency-form-drawer";
import { AgencyTable } from "@/components/agency-table";
import { PlusIcon } from "@/components/icons";
import { agencyStageStyles } from "@/components/stage-styles";
import { useToast } from "@/components/toast";
import {
  AGENCY_STAGES,
  AGENCY_STAGE_LABELS,
  type Agency,
  type AgencyStage,
} from "@/types/crm";

type AgencyView = "table" | "board";

const VIEW_STORAGE_KEY = "agencias-view";

export function AgencyWorkspace({
  agencies,
  initialAgencyId,
}: {
  agencies: Agency[];
  initialAgencyId?: string | null;
}) {
  const [localAgencies, setLocalAgencies] = useState(agencies);
  const [stage, setStage] = useState<AgencyStage | "all">("all");
  const [view, setView] = useState<AgencyView>("board");
  const [query, setQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(
    initialAgencyId ? agencies.find((agency) => agency.id === initialAgencyId) ?? null : null,
  );
  const [formAgency, setFormAgency] = useState<Agency | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // localStorage is only readable after hydration, so the persisted view
    // preference has to be applied in an effect.
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "board" || stored === "table") setView(stored);
  }, []);

  function switchView(next: AgencyView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  function replaceAgency(updated: Agency) {
    setLocalAgencies((current) =>
      current.map((agency) => (agency.id === updated.id ? updated : agency)),
    );
    if (selectedAgency?.id === updated.id) setSelectedAgency(updated);
  }

  const filteredAgencies = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt");
    return localAgencies.filter((agency) => {
      const searchable = [
        agency.company_name,
        agency.contact_name,
        agency.email,
        agency.phone,
        agency.website,
        agency.notes,
        ...agency.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt");
      return (
        (stage === "all" || agency.funnel_stage === stage) &&
        (!search || searchable.includes(search))
      );
    });
  }, [localAgencies, query, stage]);

  const activeCount = localAgencies.filter(
    (agency) => agency.funnel_stage !== "acordo" && agency.funnel_stage !== "perdido",
  ).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Agências view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5 shadow-sm"
        >
          {(["board", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchView(option)}
              aria-pressed={view === option}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
                view === option
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-foreground"
              }`}
            >
              {option === "table" ? "Table" : "Board"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {activeCount} active · {localAgencies.filter((a) => a.funnel_stage === "acordo").length} acordos
        </p>
      </div>

      {view === "table" && (
        <div className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-border bg-surface p-3 shadow-sm">
          <StageChip
            label="Todas"
            count={localAgencies.length}
            active={stage === "all"}
            onClick={() => setStage("all")}
          />
          {AGENCY_STAGES.map((item) => (
            <StageChip
              key={item}
              label={AGENCY_STAGE_LABELS[item]}
              dot={agencyStageStyles[item].dot}
              activeStyle={agencyStageStyles[item].active}
              count={localAgencies.filter((agency) => agency.funnel_stage === item).length}
              active={stage === item}
              onClick={() => setStage(stage === item ? "all" : item)}
            />
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <label className="min-w-64 flex-1">
          <span className="sr-only">Search agencies</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agency, contact, email, phone, tags or notes…"
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setFormAgency(null);
            setFormOpen(true);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
        >
          <PlusIcon className="size-4" />
          Add agency
        </button>
      </div>

      {view === "table" ? (
        <AgencyTable agencies={filteredAgencies} onSelectAgency={setSelectedAgency} />
      ) : (
        <AgencyBoard
          agencies={filteredAgencies}
          onSelectAgency={setSelectedAgency}
          onAgencyUpdated={replaceAgency}
        />
      )}
      <p className="mt-3 text-xs text-muted">
        Showing {filteredAgencies.length} of {localAgencies.length} agencies · changes save to Supabase
      </p>

      {selectedAgency && (
        <AgencyDetailsModal
          key={selectedAgency.id}
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
          onAgencyUpdated={replaceAgency}
          onEdit={() => {
            setFormAgency(selectedAgency);
            setFormOpen(true);
          }}
          onAgencyDeleted={() => {
            setLocalAgencies((current) =>
              current.filter((agency) => agency.id !== selectedAgency.id),
            );
            setSelectedAgency(null);
            showToast(`${selectedAgency.company_name} deleted`);
          }}
        />
      )}
      {formOpen && (
        <AgencyFormDrawer
          agency={formAgency}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setLocalAgencies((current) => {
              const exists = current.some((agency) => agency.id === saved.id);
              return exists
                ? current.map((agency) => (agency.id === saved.id ? saved : agency))
                : [saved, ...current];
            });
            if (selectedAgency?.id === saved.id) setSelectedAgency(saved);
            setFormOpen(false);
            showToast(formAgency ? "Agency updated" : `${saved.company_name} added to agências`);
          }}
        />
      )}
    </>
  );
}

function StageChip({
  label,
  count,
  active,
  onClick,
  dot,
  activeStyle,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
  activeStyle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-28 shrink-0 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
        active
          ? activeStyle
            ? `${activeStyle} shadow-md ring-4`
            : "border-neutral-800 bg-neutral-900 text-white shadow-md ring-4 ring-neutral-900/10"
          : "border-border bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
      }`}
    >
      <span className="flex items-center gap-2">
        {dot && <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot}`} />}
        <span className="truncate text-xs font-medium">{label}</span>
      </span>
      <span className="mt-1 block text-lg font-semibold leading-none">{count}</span>
    </button>
  );
}
