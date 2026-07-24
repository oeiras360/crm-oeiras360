import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { LeadContracts } from "@/components/lead-contracts";
import { formatDate, formatMoney } from "@/lib/client-format";
import { getPaymentEvents, getWonClient } from "@/lib/clients";

export const metadata: Metadata = { title: "Client details" };

export default async function ClientDetailsPage({ params }: PageProps<"/clients/[id]">) {
  await connection();
  const { id } = await params;
  const [result, paymentsResult] = await Promise.all([
    getWonClient(id),
    getPaymentEvents(),
  ]);
  if (!result.data) notFound();

  const client = result.data;
  const clientPayments = paymentsResult.data.filter((payment) =>
    client.deals.some((deal) => deal.id === payment.client_deal_id),
  );
  const configured = client.deals.some((deal) => deal.contract_start);
  const nextDeal = client.deals
    .filter((deal) => deal.next_payment_at)
    .sort((a, b) => a.next_payment_at!.localeCompare(b.next_payment_at!))[0];

  return (
    <>
      <Link href="/clients" className="mb-5 inline-flex text-sm font-medium text-muted hover:text-emerald-700">
        ← Back to clients
      </Link>

      <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-700 text-lg font-semibold text-white">
            {client.company_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Won client</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">{client.company_name}</h1>
            <p className="mt-1 text-sm text-muted">
              {client.deals.length} {client.deals.length === 1 ? "contract" : "contracts"}
            </p>
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {configured ? `${client.deals.length} active contract${client.deals.length === 1 ? "" : "s"}` : "Deal setup required"}
        </span>
      </header>

      {result.warning && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {result.warning}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <LeadContracts
            leadId={client.id}
            initialAccount={client}
            initialPayments={clientPayments}
            display="page"
          />

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
              {client.notes || "No delivery or account notes yet."}
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-neutral-950 p-6 text-white shadow-sm">
            <p className="text-xs text-neutral-400">Next payment</p>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {formatMoney(nextDeal?.amount_cents ?? null, nextDeal?.currency ?? "EUR")}
            </p>
            <p className="mt-1 text-sm text-neutral-400">{formatDate(nextDeal?.next_payment_at ?? null, "Not scheduled")}</p>
            <Link href="/clients/calendar" className="mt-6 inline-flex text-sm font-medium text-emerald-300 hover:text-emerald-200">
              Open payment calendar →
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Primary contact</p>
            <h2 className="mt-3 font-semibold">{client.contact_name}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <Contact href={client.email ? `mailto:${client.email}` : undefined} value={client.email ?? "No email"} />
              <Contact href={client.phone ? `tel:${client.phone}` : undefined} value={client.phone ?? "No phone"} />
              <Contact href={client.website ?? undefined} value={client.website ?? "No website"} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Contact({ href, value }: { href?: string; value: string }) {
  return href ? (
    <a href={href} className="block truncate text-neutral-700 hover:text-emerald-700">{value}</a>
  ) : (
    <p className="text-muted">{value}</p>
  );
}
