"use client";

import { EyeIcon } from "@/components/icons";
import { isOverdue } from "@/components/lead-activity";
import { StatusBadge } from "@/components/status-badge";
import type { Lead } from "@/types/crm";

const actionByStage = {
  Lead: { label: "Contact lead", style: "text-blue-700 bg-blue-50" },
  Contacted: { label: "Follow up", style: "text-amber-800 bg-amber-50" },
  Engaged: { label: "Qualify interest", style: "text-violet-700 bg-violet-50" },
  Negotiation: { label: "Advance proposal", style: "text-fuchsia-700 bg-fuchsia-50" },
  "Closed - Won": { label: "Won", style: "text-emerald-700 bg-emerald-50" },
  "Closed - On Hold": { label: "Review later", style: "text-neutral-600 bg-neutral-100" },
  "Closed - Lost": { label: "No action", style: "text-red-700 bg-red-50" },
} as const;

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function LeadTable({
  leads,
  onSelectLead,
}: {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
        <p className="font-medium text-neutral-900">No leads match these filters</p>
        <p className="mt-1 text-sm text-muted">Clear a filter or try a broader search.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3.5">Company & contact</th>
              <th className="px-4 py-3.5">Funil</th>
              <th className="px-4 py-3.5">Next action</th>
              <th className="px-4 py-3.5">Last contact</th>
              <th className="px-4 py-3.5">ICP</th>
              <th className="px-4 py-3.5">Location</th>
              <th className="px-4 py-3.5 text-center">Score</th>
              <th className="px-4 py-3.5 text-center">2nd Email</th>
              <th className="px-5 py-3.5">Channel</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const action = actionByStage[lead.funnel_stage];
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="cursor-pointer align-top transition-colors hover:bg-neutral-50/70"
                >
                  <td className="max-w-[320px] px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="block max-w-full truncate text-left font-medium text-neutral-950 underline-offset-2 hover:text-emerald-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      aria-label={`Open all details for ${lead.company_name}`}
                    >
                      {lead.company_name}
                    </button>
                    <p className="mt-1 truncate text-xs text-neutral-600">{lead.contact_name}</p>
                    <div className="mt-2 flex flex-col gap-1 text-xs">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="w-fit max-w-full truncate text-emerald-700 underline decoration-emerald-700/20 underline-offset-2 hover:decoration-emerald-700"
                          title={lead.email}
                        >
                          <span aria-hidden>✉</span> {lead.email}
                        </a>
                      ) : (
                        <span className="text-neutral-400">✉ No email</span>
                      )}
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(event) => event.stopPropagation()}
                          className="w-fit max-w-full truncate font-medium text-neutral-700 underline decoration-neutral-400/30 underline-offset-2 hover:text-emerald-700 hover:decoration-emerald-700"
                          title={lead.phone}
                        >
                          <span aria-hidden>☎</span> {lead.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-400">☎ No phone</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={lead.funnel_stage} />
                  </td>
                  <td className="max-w-[220px] px-4 py-4">
                    {lead.next_action_at ? (
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                          isOverdue(lead)
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                        title={lead.next_action_note ?? undefined}
                      >
                        {isOverdue(lead) && (
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                        )}
                        <span className="truncate">
                          {formatDate(lead.next_action_at)}
                          {lead.next_action_note ? ` · ${lead.next_action_note}` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${action.style}`}>
                        {action.label}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-4 ${lead.last_contacted_at ? "text-neutral-600" : "font-medium text-amber-700"}`}>
                    {formatDate(lead.last_contacted_at)}
                  </td>
                  <td className="px-4 py-4 text-neutral-600">{lead.icp}</td>
                  <td className="max-w-[210px] px-4 py-4 text-neutral-600">
                    <span className="line-clamp-2">{lead.location}</span>
                  </td>
                  <td className="px-4 py-4 text-center font-mono text-xs font-semibold">
                    {lead.lead_score?.toLocaleString("pt-PT") ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                        lead.second_email
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {lead.second_email ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-neutral-600">{lead.preferred_channel ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectLead(lead);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      aria-label={`View all details for ${lead.company_name}`}
                    >
                      <EyeIcon className="size-4" />
                      View details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
