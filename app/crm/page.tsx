import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DataError } from "@/components/data-error";
import { PageHeader } from "@/components/page-header";
import { stageStyles } from "@/components/stage-styles";
import { getFollowUps, getRecentActivities, getStaleLeads } from "@/lib/activities";
import { formatMoney } from "@/lib/client-format";
import { getFinancialDashboard } from "@/lib/finance";
import { getLeads } from "@/lib/supabase/queries";
import { FUNNEL_STAGES, type Lead } from "@/types/crm";

export const metadata: Metadata = { title: "CRM" };

const ACTIVITY_LABELS: Record<string, string> = {
  note: "Nota",
  email: "Email",
  call: "Chamada",
  linkedin: "LinkedIn",
  meeting: "Reunião",
  stage_change: "Mudança de fase",
};

export default async function CrmPage() {
  await connection();
  const [leadsResult, followUpsResult, staleResult, activitiesResult, finance] =
    await Promise.all([
      getLeads(),
      getFollowUps(),
      getStaleLeads(14),
      getRecentActivities(10),
      getFinancialDashboard(),
    ]);

  if (!leadsResult.data) {
    return (
      <>
        <PageHeader
          eyebrow="Overview"
          title="CRM"
          description="What needs your attention today across leads, follow-ups and revenue."
        />
        <DataError title="Could not load CRM data" message={leadsResult.error} />
      </>
    );
  }

  const leads = leadsResult.data;
  const followUps = followUpsResult.data ?? [];
  const staleLeads = staleResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const activeLeads = leads.filter(
    (lead) => !lead.funnel_stage.startsWith("Closed"),
  ).length;
  const negotiations = leads.filter(
    (lead) => lead.funnel_stage === "Negotiation",
  ).length;
  const overdueFollowUps = followUps.filter(
    (lead) => lead.next_action_at && lead.next_action_at < today,
  ).length;

  const in30Days = new Date(Date.parse(today) + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const outstanding30 = finance.months
    .flatMap((month) => month.events)
    .filter((event) => event.due_date <= in30Days && event.status !== "paid")
    .reduce((sum, event) => sum + event.amount_cents, 0);

  const metrics = [
    { label: "Active leads", value: String(activeLeads), href: "/pipeline" },
    {
      label: "Follow-ups due",
      value: String(followUps.length),
      detail: overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : undefined,
      href: "/pipeline",
      alert: overdueFollowUps > 0,
    },
    { label: "In negotiation", value: String(negotiations), href: "/pipeline" },
    {
      label: "To collect · 30 days",
      value: formatMoney(outstanding30, "EUR"),
      href: "/finance",
    },
  ];

  const maxStageCount = Math.max(
    1,
    ...FUNNEL_STAGES.map(
      (stage) => leads.filter((lead) => lead.funnel_stage === stage).length,
    ),
  );

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="CRM"
        description="What needs your attention today across leads, follow-ups and revenue."
      />

      <section aria-label="CRM metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-neutral-300"
          >
            <p className="flex items-center gap-2 text-sm text-muted">
              {metric.label}
              {metric.alert && (
                <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
              )}
            </p>
            <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-neutral-950">
              {metric.value}
            </p>
            {metric.detail && (
              <p className="mt-1 text-xs font-medium text-amber-700">{metric.detail}</p>
            )}
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Funnel</h2>
            <Link href="/pipeline" className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
              Open pipeline →
            </Link>
          </header>
          <div className="mt-4 space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = leads.filter((lead) => lead.funnel_stage === stage).length;
              const styles = stageStyles[stage];
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="flex w-40 shrink-0 items-center gap-2 text-xs text-neutral-700">
                    <span aria-hidden className={`size-2 rounded-full ${styles.dot}`} />
                    <span className="truncate">{stage}</span>
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100">
                    <div
                      className={`h-full rounded ${styles.dot} opacity-70`}
                      style={{ width: `${Math.max(count > 0 ? 4 : 0, (count / maxStageCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-neutral-600">
                    {count} · {leads.length ? Math.round((count / leads.length) * 100) : 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Follow-ups due</h2>
            <span className="text-xs text-muted">{followUps.length} total</span>
          </header>
          {followUps.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              Nothing due. Set next actions on leads to build your daily queue.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {followUps.slice(0, 8).map((lead) => (
                <FollowUpRow key={lead.id} lead={lead} today={today} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Stale leads</h2>
            <span className="text-xs text-muted">No contact in 14+ days</span>
          </header>
          {staleLeads.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              No stale leads — every active lead has recent contact or a planned
              next action.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {staleLeads.slice(0, 8).map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/pipeline?lead=${lead.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-neutral-50/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-900">
                        {lead.company_name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {lead.funnel_stage} · {lead.icp}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-amber-700">
                      {lead.last_contacted_at
                        ? `${Math.floor((Date.parse(today) - Date.parse(lead.last_contacted_at)) / 86_400_000)}d ago`
                        : "Never contacted"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Recent activity</h2>
          </header>
          {activities.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              No activity logged yet. Stage moves and logged touches show up here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activities.map((activity) => (
                <li key={activity.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-900">
                      <Link
                        href={`/pipeline?lead=${activity.lead_id}`}
                        className="font-medium hover:text-emerald-700"
                      >
                        {activity.company_name}
                      </Link>
                      <span className="text-neutral-600">
                        {" "}
                        · {ACTIVITY_LABELS[activity.type] ?? activity.type}
                        {activity.body ? ` — ${activity.body}` : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatRelative(activity.occurred_at, today)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Revenue</h2>
          <Link href="/finance" className="text-xs font-medium text-emerald-700 hover:text-emerald-900">
            Open financial dashboard →
          </Link>
        </header>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RevenueStat label="Collected" value={formatMoney(finance.collected, "EUR")} />
          <RevenueStat
            label="Outstanding"
            value={formatMoney(finance.outstanding, "EUR")}
            detail={finance.overdue > 0 ? `${formatMoney(finance.overdue, "EUR")} overdue` : undefined}
          />
          <RevenueStat
            label="Next 6 months"
            value={formatMoney(finance.sixMonthForecast, "EUR")}
          />
        </div>
      </section>
    </>
  );
}

function FollowUpRow({ lead, today }: { lead: Lead; today: string }) {
  const overdue = Boolean(lead.next_action_at && lead.next_action_at < today);
  const daysOverdue = lead.next_action_at
    ? Math.floor(
        (Date.parse(today) - Date.parse(lead.next_action_at)) / 86_400_000,
      )
    : 0;

  return (
    <li>
      <Link
        href={`/pipeline?lead=${lead.id}`}
        className="flex items-center justify-between gap-3 py-2.5 hover:bg-neutral-50/70"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-neutral-900">
            {lead.company_name}
          </span>
          <span className="block truncate text-xs text-muted">
            {lead.next_action_note ?? lead.funnel_stage}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            overdue ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {overdue ? `${daysOverdue}d overdue` : "Today"}
        </span>
      </Link>
    </li>
  );
}

function RevenueStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-50 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs font-medium text-red-700">{detail}</p>}
    </div>
  );
}

function formatRelative(value: string, today: string) {
  const days = Math.floor(
    (Date.parse(today) - Date.parse(value.slice(0, 10))) / 86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
