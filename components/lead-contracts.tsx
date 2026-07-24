"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadContractsAction } from "@/app/clients/actions";
import { DealForm } from "@/components/deal-form";
import { DealPayments } from "@/components/deal-payments";
import { DeleteDealButton } from "@/components/delete-deal-button";
import { cadenceLabel, formatDate, formatMoney } from "@/lib/client-format";
import type { ClientAccount, PaymentEvent } from "@/types/crm";

export function LeadContracts({
  leadId,
  initialAccount,
  initialPayments = [],
  display = "drawer",
}: {
  leadId: string;
  initialAccount?: ClientAccount;
  initialPayments?: PaymentEvent[];
  display?: "drawer" | "page";
}) {
  const [account, setAccount] = useState<ClientAccount | null>(initialAccount ?? null);
  const [payments, setPayments] = useState<PaymentEvent[]>(initialPayments);
  const [loading, setLoading] = useState(!initialAccount);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);

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
    if (initialAccount) return;
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
  }, [initialAccount, leadId]);

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
    <section
      className={
        display === "page"
          ? "rounded-2xl border border-border bg-surface p-6 shadow-sm"
          : "mt-8 border-t border-border pt-6"
      }
      aria-labelledby="lead-contracts-title"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3
            id="lead-contracts-title"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            Contracts
          </h3>
          <p className="mt-1 text-xs text-muted">
            {account?.deals.length ?? 0} {(account?.deals.length ?? 0) === 1 ? "contract" : "contracts"} · every contract has separate terms and payments
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingDealId(null);
            setAdding((current) => !current);
          }}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {adding ? "Cancel" : "+ Add new contract"}
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
          No contracts yet. Add a new contract and define its own payment schedule.
        </button>
      )}

      <div className="mt-4 space-y-3">
        {account?.deals.map((deal, index) => (
          <article key={deal.id} className="rounded-xl border border-border bg-white">
            <div className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
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
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingDealId((current) => current === deal.id ? null : deal.id);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {editingDealId === deal.id ? "Cancel editing" : "Edit contract"}
                </button>
                <DeleteDealButton
                  dealId={deal.id}
                  onDeleted={() => {
                    setEditingDealId(null);
                    void load();
                  }}
                />
              </div>
            </div>

            {editingDealId === deal.id && (
              <div className="border-t border-border p-4">
                <DealForm
                  client={account}
                  deal={deal}
                  onSaved={() => {
                    setEditingDealId(null);
                    void load();
                  }}
                />
              </div>
            )}

            <details className="border-t border-border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-emerald-700">
                View payment plan ({paymentsByDeal.get(deal.id)?.length ?? 0})
              </summary>
              <div className="px-4 pb-4">
                <DealPayments
                  payments={paymentsByDeal.get(deal.id) ?? []}
                  onChanged={() => void load()}
                />
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
