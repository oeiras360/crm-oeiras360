import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DealForm } from "@/components/deal-form";
import { DealPayments } from "@/components/deal-payments";
import { DeleteDealButton } from "@/components/delete-deal-button";
import { cadenceLabel, contractProgress, formatDate, formatMoney } from "@/lib/client-format";
import { getPaymentEvents, getWonClient } from "@/lib/clients";
import type { PaymentEvent } from "@/types/crm";

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
  const paymentsByDeal = new Map<string, PaymentEvent[]>();
  for (const payment of paymentsResult.data) {
    paymentsByDeal.set(payment.client_deal_id, [
      ...(paymentsByDeal.get(payment.client_deal_id) ?? []),
      payment,
    ]);
  }
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
          {client.deals.map((deal, index) => (
            <div key={deal.id} className="space-y-5">
              <ContractSummary
                deal={deal}
                number={index + 1}
                payments={paymentsByDeal.get(deal.id) ?? []}
              />
              <DealForm client={client} deal={deal} />
            </div>
          ))}

          <DealForm client={client} />

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

function ContractSummary({
  deal,
  number,
  payments,
}: {
  deal: NonNullable<Awaited<ReturnType<typeof getWonClient>>["data"]>["deals"][number];
  number: number;
  payments: PaymentEvent[];
}) {
  const progress = contractProgress(deal.contract_start, deal.contract_end);
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Contract {number}
        </p>
        <DeleteDealButton dealId={deal.id} />
      </div>
      <h2 className="mt-2 text-xl font-semibold">{deal.deal_name ?? deal.service ?? "Contract not set up"}</h2>
      <p className="mt-1 text-sm text-muted">{deal.service ?? "Service not set"}</p>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <Detail label="Contract starts" value={formatDate(deal.contract_start)} />
        <Detail label="Contract ends" value={formatDate(deal.contract_end)} />
        <Detail label="Charge amount" value={formatMoney(deal.amount_cents, deal.currency)} mono />
        <Detail label="Billing cadence" value={cadenceLabel(deal.billing_cadence)} />
      </dl>
      <div className="mt-7">
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>Contract progress</span>
          <span>{progress === null ? "Dates not set" : `${Math.round(progress)}% elapsed`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress ?? 0}%` }} />
        </div>
      </div>
      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Payments
        </p>
        <DealPayments payments={payments} />
      </div>
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1.5 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Contact({ href, value }: { href?: string; value: string }) {
  return href ? (
    <a href={href} className="block truncate text-neutral-700 hover:text-emerald-700">{value}</a>
  ) : (
    <p className="text-muted">{value}</p>
  );
}
