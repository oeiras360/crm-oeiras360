"use client";

import { isAgencyOverdue } from "@/components/agency-activity";
import { EyeIcon } from "@/components/icons";
import { agencyStageStyles } from "@/components/stage-styles";
import { AGENCY_STAGE_LABELS, type Agency, type AgencyStage } from "@/types/crm";

const actionByStage: Record<AgencyStage, { label: string; style: string }> = {
  lead: { label: "Contact agency", style: "text-blue-700 bg-blue-50" },
  contactado: { label: "Follow up", style: "text-amber-800 bg-amber-50" },
  engagemento: { label: "Book a meeting", style: "text-violet-700 bg-violet-50" },
  reuniao: { label: "Close agreement", style: "text-fuchsia-700 bg-fuchsia-50" },
  acordo: { label: "Agreed", style: "text-emerald-700 bg-emerald-50" },
  perdido: { label: "No action", style: "text-red-700 bg-red-50" },
};

export function AgencyStageBadge({ stage }: { stage: AgencyStage }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${agencyStageStyles[stage].badge}`}
    >
      {AGENCY_STAGE_LABELS[stage]}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function AgencyTable({
  agencies,
  onSelectAgency,
}: {
  agencies: Agency[];
  onSelectAgency: (agency: Agency) => void;
}) {
  if (agencies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
        <p className="font-medium text-neutral-900">No agencies here yet</p>
        <p className="mt-1 text-sm text-muted">Add an agency or broaden your search.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3.5">Agency & contact</th>
              <th className="px-4 py-3.5">Fase</th>
              <th className="px-4 py-3.5">Next action</th>
              <th className="px-4 py-3.5">Last contact</th>
              <th className="px-4 py-3.5">Tags</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agencies.map((agency) => {
              const action = actionByStage[agency.funnel_stage];
              const overdue = isAgencyOverdue(agency);
              return (
                <tr
                  key={agency.id}
                  onClick={() => onSelectAgency(agency)}
                  className="cursor-pointer align-top transition-colors hover:bg-neutral-50/70"
                >
                  <td className="max-w-[320px] px-5 py-4">
                    <p className="truncate font-medium text-neutral-950">{agency.company_name}</p>
                    <p className="mt-1 truncate text-xs text-neutral-600">
                      {agency.contact_name}
                      {agency.job_title ? ` · ${agency.job_title}` : ""}
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-xs">
                      {agency.email ? (
                        <a
                          href={`mailto:${agency.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="w-fit max-w-full truncate text-emerald-700 underline decoration-emerald-700/20 underline-offset-2 hover:decoration-emerald-700"
                          title={agency.email}
                        >
                          <span aria-hidden>✉</span> {agency.email}
                        </a>
                      ) : (
                        <span className="text-neutral-400">✉ No email</span>
                      )}
                      {agency.phone ? (
                        <a
                          href={`tel:${agency.phone}`}
                          onClick={(event) => event.stopPropagation()}
                          className="w-fit max-w-full truncate font-medium text-neutral-700 underline decoration-neutral-400/30 underline-offset-2 hover:text-emerald-700 hover:decoration-emerald-700"
                        >
                          <span aria-hidden>☎</span> {agency.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-400">☎ No phone</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AgencyStageBadge stage={agency.funnel_stage} />
                  </td>
                  <td className="max-w-[240px] px-4 py-4">
                    {agency.next_action_at ? (
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                          overdue ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"
                        }`}
                        title={agency.next_action_note ?? undefined}
                      >
                        {overdue && (
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                        )}
                        <span className="truncate">
                          {formatDate(agency.next_action_at)}
                          {agency.next_action_note ? ` · ${agency.next_action_note}` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${action.style}`}>
                        {action.label}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-4 ${agency.last_contacted_at ? "text-neutral-600" : "font-medium text-amber-700"}`}>
                    {formatDate(agency.last_contacted_at)}
                  </td>
                  <td className="max-w-[220px] px-4 py-4">
                    {agency.tags.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {agency.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectAgency(agency);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      aria-label={`View all details for ${agency.company_name}`}
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
