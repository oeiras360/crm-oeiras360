"use client";

import { useMemo, useState } from "react";
import { LeadDetailsModal } from "@/components/lead-details-modal";
import { LeadTable } from "@/components/lead-table";
import { StatusBadge } from "@/components/status-badge";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

interface PipelineWorkspaceProps {
  leads: Lead[];
}

export function PipelineWorkspace({ leads }: PipelineWorkspaceProps) {
  const [stage, setStage] = useState<FunnelStage | "all">("all");
  const [icp, setIcp] = useState("all");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const icps = useMemo(() => [...new Set(leads.map((lead) => lead.icp))].sort(), [leads]);
  const locations = useMemo(
    () => [...new Set(leads.map((lead) => lead.location))].sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt");

    return leads.filter((lead) => {
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
  }, [icp, leads, location, query, stage]);

  return (
    <>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStage("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
            stage === "all"
              ? "bg-neutral-900 text-white ring-neutral-900"
              : "bg-white text-neutral-600 ring-border"
          }`}
        >
          All · {leads.length}
        </button>
        {FUNNEL_STAGES.map((item) => {
          const count = leads.filter((lead) => lead.funnel_stage === item).length;
          if (count === 0) return null;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setStage(stage === item ? "all" : item)}
              className={`shrink-0 rounded-full p-0.5 ${stage === item ? "ring-2 ring-neutral-900 ring-offset-1" : ""}`}
              aria-pressed={stage === item}
            >
              <StatusBadge status={item} />
              <span className="ml-1.5 pr-2 text-xs font-semibold text-neutral-500">{count}</span>
            </button>
          );
        })}
      </div>

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
      </div>

      <LeadTable leads={filteredLeads} onSelectLead={setSelectedLead} />
      <p className="mt-3 text-xs text-muted">
        Showing {filteredLeads.length} of {leads.length} leads · Funil follows the Notion export
      </p>
      {selectedLead && (
        <LeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
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
