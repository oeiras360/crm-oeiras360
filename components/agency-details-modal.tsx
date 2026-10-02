"use client";

import { useState, useTransition } from "react";
import { deleteAgencyAction, updateAgencyStageAction } from "@/app/agencias/actions";
import { AgencyActivitySection, AgencyNextActionSection } from "@/components/agency-activity";
import { AgencyStageBadge } from "@/components/agency-table";
import { Drawer } from "@/components/drawer";
import { CloseIcon } from "@/components/icons";
import { agencyStageStyles } from "@/components/stage-styles";
import {
  AGENCY_STAGES,
  AGENCY_STAGE_LABELS,
  type Agency,
  type AgencyStage,
} from "@/types/crm";

export function AgencyDetailsModal({
  agency,
  onClose,
  onAgencyUpdated,
  onEdit,
  onAgencyDeleted,
}: {
  agency: Agency;
  onClose: () => void;
  onAgencyUpdated: (agency: Agency) => void;
  onEdit: () => void;
  onAgencyDeleted: () => void;
}) {
  const [stage, setStage] = useState<AgencyStage>(agency.funnel_stage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <Drawer labelledBy="agency-dialog-title" onClose={onClose}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-border bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
        <div className="min-w-0">
          <div className="mb-2">
            <AgencyStageBadge stage={agency.funnel_stage} />
          </div>
          <h2 id="agency-dialog-title" className="truncate text-2xl font-semibold tracking-tight">
            {agency.company_name}
          </h2>
          <p className="mt-1 text-sm text-muted">{agency.contact_name}</p>
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
            aria-label="Close agency details"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <div className="px-5 py-6 sm:px-7">
        <section aria-labelledby="funnel-details-title">
          <h3
            id="funnel-details-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            Funil
          </h3>
          <dl className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700">
                Fase
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
                    aria-label="Fase"
                    value={stage}
                    disabled={isPending}
                    onChange={(event) => {
                      const nextStage = event.target.value as AgencyStage;
                      const previousStage = stage;
                      setStage(nextStage);
                      setError(null);
                      startTransition(async () => {
                        const result = await updateAgencyStageAction(agency.id, nextStage);
                        if (!result.data) {
                          setStage(previousStage);
                          setError(result.error);
                          return;
                        }
                        onAgencyUpdated(result.data);
                      });
                    }}
                    className={`h-12 w-full cursor-pointer appearance-none rounded-xl border-2 py-0 pl-10 pr-11 text-sm font-semibold shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-emerald-700/15 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 ${agencyStageStyles[stage].control}`}
                  >
                    {AGENCY_STAGES.map((option) => (
                      <option key={option} value={option}>
                        {AGENCY_STAGE_LABELS[option]}
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
            <Detail label="Último contato">{formatDate(agency.last_contacted_at)}</Detail>
            <Detail label="Fonte">{agency.source ?? "—"}</Detail>
            <Detail label="Tags">
              {agency.tags.length ? (
                <span className="flex flex-wrap gap-1.5">
                  {agency.tags.map((tag) => (
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
          </dl>
        </section>

        <AgencyNextActionSection agency={agency} onAgencyUpdated={onAgencyUpdated} />

        <AgencyActivitySection agency={agency} />

        <section aria-labelledby="contact-details-title" className="mt-8 border-t border-border pt-6">
          <h3
            id="contact-details-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            Contacto
          </h3>
          <dl className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Detail label="Agência">{agency.company_name}</Detail>
            <Detail label="Nome">{agency.contact_name}</Detail>
            <Detail label="Cargo">{agency.job_title ?? "—"}</Detail>
            <Detail label="E-mail">
              {agency.email ? <ContactLink href={`mailto:${agency.email}`}>{agency.email}</ContactLink> : "—"}
            </Detail>
            <Detail label="Telefone">
              {agency.phone ? <ContactLink href={`tel:${agency.phone}`}>{agency.phone}</ContactLink> : "—"}
            </Detail>
            <Detail label="Site">
              {agency.website ? <ContactLink href={agency.website}>{agency.website}</ContactLink> : "—"}
            </Detail>
            <Detail label="LinkedIn">
              {agency.linkedin_url ? (
                <ContactLink href={agency.linkedin_url}>{agency.linkedin_url}</ContactLink>
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
            {agency.notes || "No notes recorded."}
          </p>
        </section>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-xs text-muted">
            Deleting removes the agency and its activity history permanently.
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
                  const result = await deleteAgencyAction(agency.id);
                  if (result.error) {
                    setDeleteError(result.error);
                    setConfirmingDelete(false);
                    return;
                  }
                  onAgencyDeleted();
                });
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:opacity-60 ${
                confirmingDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-red-200 text-red-700 hover:bg-red-50"
              }`}
            >
              {isDeleting ? "Deleting…" : confirmingDelete ? "Confirm delete" : "Delete agency"}
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
