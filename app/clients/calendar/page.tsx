import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PaymentCalendar } from "@/components/payment-calendar";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney } from "@/lib/client-format";
import { getPaymentEvents } from "@/lib/clients";

export const metadata: Metadata = { title: "Payment calendar" };

export default async function PaymentCalendarPage() {
  await connection();
  const result = await getPaymentEvents();
  const upcoming = result.data
    .filter((event) => event.status !== "paid")
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Clients won"
        title="Payment calendar"
        description="See when every client should be charged and spot overdue payments before they slip."
        action={
          <Link
            href="/clients"
            className="inline-flex rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-neutral-50"
          >
            Back to clients
          </Link>
        }
      />

      {result.warning && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {result.warning}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <PaymentCalendar events={result.data} />
        <aside className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Next charges
          </p>
          <h2 className="mt-2 text-lg font-semibold">Upcoming</h2>
          <div className="mt-5 space-y-4">
            {upcoming.length ? (
              upcoming.map((event) => (
                <div key={event.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{event.company_name}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(event.due_date)}</p>
                    </div>
                    <p className="font-mono text-sm font-semibold">
                      {formatMoney(event.amount_cents, event.currency)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted">
                No payment events scheduled. They will appear here once commercial terms are set.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
