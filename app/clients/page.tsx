import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ClientCard } from "@/components/client-card";
import { CalendarIcon, ClientsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/client-format";
import { getWonClients } from "@/lib/clients";

export const metadata: Metadata = { title: "Clients won" };

export default async function ClientsPage() {
  await connection();
  const result = await getWonClients();
  const deals = result.data.flatMap((client) => client.deals);
  const totalValue = deals.reduce((sum, deal) => sum + (deal.amount_cents ?? 0), 0);
  const upcoming = deals.filter((deal) => deal.next_payment_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Delivery & revenue"
        title="Clients won"
        description="Keep every active agreement, contract period, and upcoming charge in one place."
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

      {result.warning && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {result.warning}
        </div>
      )}

      <section aria-label="Client metrics" className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Won clients" value={String(result.data.length)} />
        <Metric label="Configured deal value" value={formatMoney(totalValue)} />
        <Metric label="Upcoming charges" value={String(upcoming)} />
      </section>

      {result.data.length ? (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {result.data.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </section>
      ) : (
        <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ClientsIcon className="size-6" />
            </span>
            <h2 className="mt-4 font-semibold text-neutral-950">No won clients yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Leads appear here automatically when their pipeline stage changes to Closed - Won.
            </p>
            <Link
              href="/pipeline"
              className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Open pipeline
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-neutral-950">{value}</p>
    </article>
  );
}
