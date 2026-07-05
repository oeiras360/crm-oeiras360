import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { cadenceLabel, contractProgress, formatDate, formatMoney } from "@/lib/client-format";
import type { ClientAccount } from "@/types/crm";

export function ClientCard({ client }: { client: ClientAccount }) {
  const configuredDeals = client.deals.filter((deal) => deal.contract_start);
  const primary = configuredDeals[0] ?? client.deals[0];
  const configured = configuredDeals.length > 0;
  const progress = contractProgress(primary?.contract_start ?? null, primary?.contract_end ?? null);
  const totalValue = client.deals.reduce((sum, deal) => sum + (deal.amount_cents ?? 0), 0);

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group block rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800">
            {client.company_name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-neutral-950">{client.company_name}</h2>
            <p className="truncate text-sm text-muted">
              {client.deals.length} {client.deals.length === 1 ? "contract" : "contracts"} · {client.contact_name}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            configured
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {configured ? "Active" : "Setup needed"}
        </span>
      </div>

      <div className="my-5 h-px bg-border" />
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted">Deal value</dt>
          <dd className="mt-1 font-mono text-sm font-semibold">
            {formatMoney(totalValue, primary?.currency ?? "EUR")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Billing</dt>
          <dd className="mt-1 text-sm font-medium">
            {client.deals.length > 1 ? "Multiple" : cadenceLabel(primary?.billing_cadence ?? null)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Contract ends</dt>
          <dd className="mt-1 text-sm font-medium">{formatDate(primary?.contract_end ?? null)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Next charge</dt>
          <dd className="mt-1 text-sm font-medium">{formatDate(primary?.next_payment_at ?? null)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-[11px] text-muted">
          <span>Contract progress</span>
          <span>{progress === null ? "—" : `${Math.round(progress)}%`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-1.5 text-sm font-medium text-neutral-700 group-hover:text-emerald-700">
        View client <ArrowRightIcon className="size-4" />
      </div>
    </Link>
  );
}
