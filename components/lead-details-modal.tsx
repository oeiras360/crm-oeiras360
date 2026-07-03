"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { Lead } from "@/types/crm";

export function LeadDetailsModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 backdrop-blur-[1px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-dialog-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
      >
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
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="shrink-0 rounded-lg p-2 text-muted hover:bg-neutral-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Close lead details"
          >
            <CloseIcon />
          </button>
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
              <Detail label="Funil">
                <StatusBadge status={lead.funnel_stage} />
              </Detail>
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
        </div>
      </section>
    </div>
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
