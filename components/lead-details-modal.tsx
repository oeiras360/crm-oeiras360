"use client";

import { useState, useTransition } from "react";
import { deleteLeadAction, updateLeadFunnelAction } from "@/app/pipeline/actions";
import { Drawer } from "@/components/drawer";
import { ActivitySection, NextActionSection } from "@/components/lead-activity";
import { CloseIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

const funnelControlStyles: Record<FunnelStage, string> = {
  Lead: "border-blue-200 bg-blue-50/70 text-blue-800 hover:border-blue-400",
  Contacted: "border-amber-200 bg-amber-50/70 text-amber-900 hover:border-amber-400",
  Engaged: "border-violet-200 bg-violet-50/70 text-violet-800 hover:border-violet-400",
  Negotiation: "border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-800 hover:border-fuchsia-400",
  "Closed - Won":
    "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:border-emerald-400",
  "Closed - On Hold":
    "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400",
  "Closed - Lost": "border-red-200 bg-red-50/70 text-red-800 hover:border-red-400",
};

export function LeadDetailsModal({
  lead,
  onClose,
  onLeadUpdated,
  onEdit,
  onLeadDeleted,
}: {
  lead: Lead;
  onClose: () => void;
  onLeadUpdated: (lead: Lead) => void;
  onEdit: () => void;
  onLeadDeleted: () => void;
}) {
  const [funnelStage, setFunnelStage] = useState<FunnelStage>(lead.funnel_stage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <Drawer labelledBy="lead-dialog-title" onClose={onClose}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-border bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <div className="mb-2">
              <StatusBadge status={lead.funnel_stage} />
            </div>
            <h2 id="lead-dialog-title" className="truncate text-2xl font-semibold tracking-tight">
              {lead.company_name}
            </h2>
            <p className="mt-1 text-sm text-muted">{lead.contact_name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-neutral-700 hover:border-emerald-700/40 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="rounded-lg p-2 text-muted hover:bg-neutral-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              aria-label="Close lead details"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-7">
          <section aria-labelledby="sales-details-title">
            <h3
              id="sales-details-title"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
            >
              Sales
            </h3>
            <dl className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                  Funil
                  <span className="normal-case tracking-normal text-muted">Click to change stage</span>
                </dt>
                <dd className="flex items-center gap-3">
                  <div className="group relative w-full sm:max-w-sm">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-4 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-current opacity-70"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm transition-transform group-hover:-translate-y-1"
                    >
                      ▾
                    </span>
                  <select
                    aria-label="Funil"
                    value={funnelStage}
                    disabled={isPending}
                    onChange={(event) => {
                      const nextStage = event.target.value as FunnelStage;
                      const previousStage = funnelStage;
                      setFunnelStage(nextStage);
                      setError(null);
                      startTransition(async () => {
                        const result = await updateLeadFunnelAction(lead.id, nextStage);
                        if (!result.data) {
                          setFunnelStage(previousStage);
                          setError(result.error);
                          return;
                        }
                        onLeadUpdated(result.data);
                      });
                    }}
                      className={`h-12 w-full cursor-pointer appearance-none rounded-xl border-2 py-0 pl-10 pr-11 text-sm font-semibold shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-emerald-700/15 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 ${funnelControlStyles[funnelStage]}`}
                  >
                    {FUNNEL_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  </div>
                  {isPending && <span className="text-xs text-muted">Saving…</span>}
                </dd>
                {error && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {error}
                  </p>
                )}
              </div>
              <Detail label="Pontuação do lead">
                {lead.lead_score?.toLocaleString("pt-PT") ?? "—"}
              </Detail>
              <Detail label="ICP">{lead.icp}</Detail>
              <Detail label="Canal">{lead.preferred_channel ?? "—"}</Detail>
              <Detail label="Último contato">{formatDate(lead.last_contacted_at)}</Detail>
              <Detail label="Tags">
                {lead.tags.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Fonte">{lead.source ?? "—"}</Detail>
              <Detail label="Local">{lead.location}</Detail>
            </dl>
          </section>

          <NextActionSection lead={lead} onLeadUpdated={onLeadUpdated} />

          <ActivitySection lead={lead} />

          <section aria-labelledby="contact-details-title" className="mt-8 border-t border-border pt-6">
            <h3
              id="contact-details-title"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
            >
              Contact
            </h3>
            <dl className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Empresa">{lead.company_name}</Detail>
              <Detail label="Nome">{lead.contact_name}</Detail>
              <Detail label="Cargo">{lead.job_title ?? "—"}</Detail>
              <Detail label="E-mail">
                {lead.email ? <ContactLink href={`mailto:${lead.email}`}>{lead.email}</ContactLink> : "—"}
              </Detail>
              <Detail label="Telefone">
                {lead.phone ? <ContactLink href={`tel:${lead.phone}`}>{lead.phone}</ContactLink> : "—"}
              </Detail>
              <Detail label="Site">
                {lead.website ? <ContactLink href={lead.website}>{lead.website}</ContactLink> : "—"}
              </Detail>
              <Detail label="LinkedIn">
                {lead.linkedin_url ? (
                  <ContactLink href={lead.linkedin_url}>{lead.linkedin_url}</ContactLink>
                ) : (
                  "—"
                )}
              </Detail>
            </dl>
          </section>

          <section aria-labelledby="notes-title" className="mt-8 border-t border-border pt-6">
            <h3
              id="notes-title"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
            >
              Notas
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
              {lead.notes || "No notes recorded."}
            </p>
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <p className="text-xs text-muted">
              Deleting removes the lead and its activity history permanently.
            </p>
            <div className="flex items-center gap-2">
              {confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (!confirmingDelete) {
                    setConfirmingDelete(true);
                    return;
                  }
                  setDeleteError(null);
                  startDeleteTransition(async () => {
                    const result = await deleteLeadAction(lead.id);
                    if (result.error) {
                      setDeleteError(result.error);
                      setConfirmingDelete(false);
                      return;
                    }
                    onLeadDeleted();
                  });
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:opacity-60 ${
                  confirmingDelete
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border border-red-200 text-red-700 hover:bg-red-50"
                }`}
              >
                {isDeleting
                  ? "Deleting…"
                  : confirmingDelete
                    ? "Confirm delete"
                    : "Delete lead"}
              </button>
            </div>
            {deleteError && (
              <p role="alert" className="w-full text-xs text-red-700">
                {deleteError}
              </p>
            )}
          </section>
        </div>
    </Drawer>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

function ContactLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="text-emerald-700 underline decoration-emerald-700/25 underline-offset-2 hover:decoration-emerald-700"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
