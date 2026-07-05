import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarIcon } from "@/components/icons";
import { FinancialForecast } from "@/components/financial-forecast";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/client-format";
import { getFinancialDashboard } from "@/lib/finance";

export const metadata: Metadata = { title: "Financial dashboard" };

export default async function FinancialDashboardPage() {
  await connection();
  const data = await getFinancialDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Financial dashboard"
        description="Understand the revenue already won and what is expected to arrive over the next six months."
        action={
          <Link
            href="/clients/calendar"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-neutral-50"
          >
            <CalendarIcon className="size-4 text-emerald-700" />
            Payment calendar
          </Link>
        }
      />

      {data.warning && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data.warning}
        </div>
      )}

      <section aria-label="Financial metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Accumulated won revenue"
          value={formatMoney(data.accumulatedWon)}
          note="All generated contract payments"
          dark
        />
        <Metric
          label="Next 6 months"
          value={formatMoney(data.sixMonthForecast)}
          note="Expected incoming revenue"
        />
        <Metric
          label="Collected"
          value={formatMoney(data.collected)}
          note="Payments marked as paid"
        />
        <Metric
          label="Outstanding"
          value={formatMoney(data.outstanding)}
          note={data.overdue ? `${formatMoney(data.overdue)} overdue` : "Nothing overdue"}
          alert={data.overdue > 0}
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <FinancialForecast months={data.months} />

        <aside className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Revenue concentration
          </p>
          <h2 className="mt-2 text-xl font-semibold">Top clients</h2>
          <p className="mt-1 text-sm text-muted">Paid + upcoming, all contracts</p>
          <div className="mt-6 space-y-5">
            {data.topClients.length ? (
              data.topClients.map((client, index) => (
                <div key={client.company_name}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">
                      <span className="mr-2 font-mono text-xs text-neutral-400">{index + 1}</span>
                      {client.company_name}
                    </p>
                    <p className="shrink-0 font-mono text-sm font-semibold">
                      {formatMoney(client.amount_cents)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${data.accumulatedWon ? (client.amount_cents / data.accumulatedWon) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-muted">
                Add contract terms and a next charge date to generate the revenue forecast.
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  dark = false,
  alert = false,
}: {
  label: string;
  value: string;
  note: string;
  dark?: boolean;
  alert?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        dark
          ? "border-neutral-950 bg-neutral-950 text-white"
          : alert
            ? "border-rose-200 bg-rose-50"
            : "border-border bg-surface"
      }`}
    >
      <p className={`text-xs ${dark ? "text-neutral-400" : alert ? "text-rose-700" : "text-muted"}`}>
        {label}
      </p>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 text-xs ${dark ? "text-neutral-400" : alert ? "text-rose-600" : "text-muted"}`}>
        {note}
      </p>
    </article>
  );
}
