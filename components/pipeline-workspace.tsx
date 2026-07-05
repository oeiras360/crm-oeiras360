"use client";

import { useEffect, useMemo, useState } from "react";
import { LeadDetailsModal } from "@/components/lead-details-modal";
import { LeadFormDrawer } from "@/components/lead-form-drawer";
import { LeadTable } from "@/components/lead-table";
import { PipelineBoard } from "@/components/pipeline-board";
import { PlusIcon } from "@/components/icons";
import { stageStyles } from "@/components/stage-styles";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

interface PipelineWorkspaceProps {
  leads: Lead[];
  initialLeadId?: string | null;
}

type PipelineView = "table" | "board";

const VIEW_STORAGE_KEY = "pipeline-view";

export function PipelineWorkspace({ leads, initialLeadId }: PipelineWorkspaceProps) {
  const [localLeads, setLocalLeads] = useState(leads);
  const [stage, setStage] = useState<FunnelStage | "all">("all");
  const [view, setView] = useState<PipelineView>("table");

  useEffect(() => {
    // localStorage is only readable after hydration, so the persisted view
    // preference has to be applied in an effect.
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "board" || stored === "table") setView(stored);
  }, []);

  function switchView(next: PipelineView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }
  const [icp, setIcp] = useState("all");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(
    initialLeadId ? leads.find((lead) => lead.id === initialLeadId) ?? null : null,
  );
  const [formLead, setFormLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const icps = useMemo(
    () => [...new Set(localLeads.map((lead) => lead.icp))].sort(),
    [localLeads],
  );
  const locations = useMemo(
    () => [...new Set(localLeads.map((lead) => lead.location))].sort(),
    [localLeads],
  );

  const filteredLeads = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt");

    return localLeads.filter((lead) => {
      const searchable = [
        lead.company_name,
        lead.contact_name,
        lead.email,
        lead.phone,
        lead.website,
        lead.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt");

      return (
        (stage === "all" || lead.funnel_stage === stage) &&
        (icp === "all" || lead.icp === icp) &&
        (location === "all" || lead.location === location) &&
        (!search || searchable.includes(search))
      );
    });
  }, [icp, localLeads, location, query, stage]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Pipeline view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5 shadow-sm"
        >
          {(["table", "board"] as const).map((option) => (
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
      </div>

      {view === "table" && (
      <div className="mb-4 rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-4 px-0.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Pipeline stages</p>
            <p className="mt-0.5 text-xs text-muted">Select a stage to focus the lead list</p>
          </div>
          {stage !== "all" && (
            <button
              type="button"
              onClick={() => setStage("all")}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
            >
              Show all
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStage("all")}
            aria-pressed={stage === "all"}
            className={`group relative min-w-28 shrink-0 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
              stage === "all"
                ? "border-neutral-800 bg-neutral-900 text-white shadow-md ring-4 ring-neutral-900/10"
                : "border-border bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md"
            }`}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium">All leads</span>
              <span
                aria-hidden
                className={`text-sm transition-transform duration-200 group-hover:translate-x-0.5 ${
                  stage === "all" ? "text-white/70" : "text-neutral-300"
                }`}
              >
                →
              </span>
            </span>
            <span className="mt-1 block text-lg font-semibold leading-none">{localLeads.length}</span>
          </button>

          {FUNNEL_STAGES.map((item) => {
            const count = localLeads.filter((lead) => lead.funnel_stage === item).length;
            if (count === 0) return null;
            const isActive = stage === item;
            const styles = stageStyles[item];

            return (
              <button
                key={item}
                type="button"
                onClick={() => setStage(isActive ? "all" : item)}
                aria-pressed={isActive}
                title={isActive ? `Remove ${item} filter` : `Show ${count} ${item} leads`}
                className={`group relative min-w-36 shrink-0 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 ${
                  isActive
                    ? `${styles.active} shadow-md ring-4`
                    : `border-border bg-white text-neutral-700 hover:-translate-y-0.5 hover:shadow-md ${styles.hover}`
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${styles.dot} transition-transform duration-200 group-hover:scale-125`}
                    />
                    <span className="truncate text-xs font-medium">{item}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`text-sm transition-all duration-200 group-hover:translate-x-0.5 ${
                      isActive ? "opacity-70" : "text-neutral-300 group-hover:text-neutral-500"
                    }`}
                  >
                    {isActive ? "✓" : "→"}
                  </span>
                </span>
                <span className="mt-1 block text-lg font-semibold leading-none">{count}</span>
                <span className="mt-1 block text-[10px] text-current opacity-55">
                  {Math.round((count / localLeads.length) * 100)}% of pipeline
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_260px_auto]">
        <label>
          <span className="sr-only">Search leads</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company, contact, email, phone, website or notes…"
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
          />
        </label>
        <FilterSelect label="ICP" value={icp} onChange={setIcp} options={icps} />
        <FilterSelect
          label="Zone / location"
          value={location}
          onChange={setLocation}
          options={locations}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStage("all");
              setIcp("all");
              setLocation("all");
              setQuery("");
            }}
            className="h-10 rounded-lg px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFormLead(null);
              setFormOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
          >
            <PlusIcon className="size-4" />
            Add lead
          </button>
        </div>
      </div>

      {view === "table" ? (
        <LeadTable leads={filteredLeads} onSelectLead={setSelectedLead} />
      ) : (
        <PipelineBoard
          leads={filteredLeads}
          onSelectLead={setSelectedLead}
          onLeadUpdated={(updatedLead) => {
            setLocalLeads((current) =>
              current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
            );
            if (selectedLead?.id === updatedLead.id) setSelectedLead(updatedLead);
          }}
        />
      )}
      <p className="mt-3 text-xs text-muted">
        Showing {filteredLeads.length} of {localLeads.length} leads · changes save to Supabase
      </p>
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updatedLead) => {
            setLocalLeads((current) =>
              current.map((lead) => (lead.id === selectedLead.id ? updatedLead : lead)),
            );
            setSelectedLead(updatedLead);
          }}
          onEdit={() => {
            setFormLead(selectedLead);
            setFormOpen(true);
          }}
          onLeadDeleted={() => {
            setLocalLeads((current) =>
              current.filter((lead) => lead.id !== selectedLead.id),
            );
            setSelectedLead(null);
          }}
        />
      )}
      {formOpen && (
        <LeadFormDrawer
          lead={formLead}
          onClose={() => setFormOpen(false)}
          onSaved={(savedLead) => {
            setLocalLeads((current) => {
              const exists = current.some((lead) => lead.id === savedLead.id);
              return exists
                ? current.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
                : [savedLead, ...current];
            });
            if (selectedLead?.id === savedLead.id) setSelectedLead(savedLead);
            setFormOpen(false);
          }}
        />
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-neutral-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
      >
        <option value="all">All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted">
        ▾
      </span>
    </label>
  );
}
