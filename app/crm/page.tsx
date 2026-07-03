import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
import { getContactTemplates, getLeads } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage() {
  await connection();
  const [leadsResult, templatesResult] = await Promise.all([
    getLeads(),
    getContactTemplates(),
  ]);

  if (!leadsResult.data) {
    return (
      <>
        <PageHeader
          eyebrow="Overview"
          title="CRM"
          description="A quick view of your sales activity and the actions that need attention."
        />
        <DataError title="Could not load CRM data" message={leadsResult.error} />
      </>
    );
  }

  const leads = leadsResult.data;
  const activeLeads = leads.filter(
    (lead) => !lead.funnel_stage.startsWith("Closed"),
  ).length;
  const followUps = leads.filter((lead) =>
    ["Contacted", "Engaged"].includes(lead.funnel_stage),
  ).length;
  const negotiations = leads.filter(
    (lead) => lead.funnel_stage === "Negotiation",
  ).length;
  const metrics = [
    { label: "Active leads", value: activeLeads },
    { label: "Need follow-up", value: followUps },
    { label: "In negotiation", value: negotiations },
    { label: "Contact templates", value: templatesResult.data?.length ?? 0 },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="CRM"
        description="A quick view of your sales activity and the actions that need attention."
      />

      <section aria-label="CRM metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-neutral-950">
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Link
          href="/pipeline"
          className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-neutral-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Sales pipeline
          </p>
          <h2 className="mt-2 text-lg font-semibold">Review leads and next actions</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Open the full pipeline to update statuses, review contacts, and plan follow-ups.
          </p>
          <p className="mt-5 text-sm font-medium text-neutral-900 group-hover:text-emerald-700">
            Open pipeline →
          </p>
        </Link>

        <Link
          href="/templates"
          className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-neutral-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Outreach
          </p>
          <h2 className="mt-2 text-lg font-semibold">Use a contact template</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Find reusable email and LinkedIn messages for consistent prospecting.
          </p>
          <p className="mt-5 text-sm font-medium text-neutral-900 group-hover:text-emerald-700">
            View templates →
          </p>
        </Link>
      </section>
    </>
  );
}
