"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadContractsAction } from "@/app/clients/actions";
import { DealForm } from "@/components/deal-form";
import { DealPayments } from "@/components/deal-payments";
import { cadenceLabel, formatDate, formatMoney } from "@/lib/client-format";
import type { ClientAccount, PaymentEvent } from "@/types/crm";

export function LeadContracts({ leadId }: { leadId: string }) {
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [payments, setPayments] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const result = await getLeadContractsAction(leadId);
    if (!result.data) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setAccount(result.data.account);
    setPayments(result.data.payments);
    setError(null);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    let ignore = false;
    getLeadContractsAction(leadId).then((result) => {
      if (ignore) return;
      if (!result.data) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setAccount(result.data.account);
      setPayments(result.data.payments);
      setError(null);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [leadId]);

  const paymentsByDeal = useMemo(() => {
    const grouped = new Map<string, PaymentEvent[]>();
    for (const payment of payments) {
      grouped.set(payment.client_deal_id, [
        ...(grouped.get(payment.client_deal_id) ?? []),
        payment,
      ]);
    }
    return grouped;
  }, [payments]);

  if (loading) {
    return (
      <section className="mt-8 border-t border-border pt-6" aria-label="Contracts">
        <div className="h-5 w-28 animate-pulse rounded bg-neutral-100" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
      </section>
    );
  }

  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="lead-contracts-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3
            id="lead-contracts-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            Contracts
          </h3>
          <p className="mt-1 text-xs text-muted">
            {account?.deals.length ?? 0} {(account?.deals.length ?? 0) === 1 ? "contract" : "contracts"} · each has its own payment plan
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {adding ? "Cancel" : "Add contract"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      {account && adding && (
        <div className="mt-4">
          <DealForm
            client={account}
            onSaved={() => {
              setAdding(false);
              void load();
            }}
          />
        </div>
      )}

      {account && account.deals.length === 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 w-full rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-800"
        >
          No contracts yet. Add the first contract and its payment schedule.
        </button>
      )}

      <div className="mt-4 space-y-3">
        {account?.deals.map((deal, index) => (
          <details key={deal.id} className="group rounded-xl border border-border bg-white">
            <summary className="cursor-pointer list-none px-4 py-4 marker:content-none">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-700">Contract {index + 1}</p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {deal.deal_name ?? deal.service ?? "Contract not set up"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(deal.contract_start)} – {formatDate(deal.contract_end)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold">
                    {formatMoney(deal.amount_cents, deal.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{cadenceLabel(deal.billing_cadence)}</p>
                </div>
              </div>
            </summary>
            <div className="border-t border-border px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                Payment plan
              </p>
              <DealPayments
                payments={paymentsByDeal.get(deal.id) ?? []}
                onChanged={() => void load()}
              />
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-emerald-700">
                  Edit contract terms
                </summary>
                <div className="mt-3">
                  <DealForm client={account} deal={deal} onSaved={() => void load()} />
                </div>
              </details>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
