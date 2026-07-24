"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveClientDeal } from "@/app/clients/actions";
import type { ClientAccount, ClientDeal } from "@/types/crm";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export function DealForm({
  client,
  deal,
  onSaved,
}: {
  client: ClientAccount;
  deal?: ClientDeal;
  onSaved?: () => void;
}) {
  const boundAction = saveClientDeal.bind(null, client.id, deal?.id ?? null);
  const [state, action, pending] = useActionState(boundAction, {
    error: null,
    savedDealId: null,
    savedAt: null,
  });
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    if (!state.savedAt) return;
    if (!deal) formRef.current?.reset();
    router.refresh();
    onSavedRef.current?.();
  }, [deal, router, state.savedAt]);

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Commercial terms
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {deal ? "Edit contract" : "New contract"}
          </h2>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving…" : deal ? "Save changes" : "Create contract"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Deal name">
          <input className={inputClass} name="deal_name" required defaultValue={deal?.deal_name ?? ""} placeholder="Website + content retainer" />
        </Field>
        <Field label="Service">
          <input className={inputClass} name="service" required defaultValue={deal?.service ?? ""} placeholder="Oeiras360 growth package" />
        </Field>
        <Field label="Contract starts">
          <input className={inputClass} name="contract_start" type="date" required defaultValue={deal?.contract_start ?? ""} />
        </Field>
        <Field label="Contract ends">
          <input className={inputClass} name="contract_end" type="date" required defaultValue={deal?.contract_end ?? ""} />
        </Field>
        <Field label="Amount per charge (€)">
          <input className={inputClass} name="amount" type="number" min="0" step="0.01" required defaultValue={deal?.amount_cents == null ? "" : deal.amount_cents / 100} placeholder="750" />
        </Field>
        <Field label="Billing cadence">
          <select className={inputClass} name="billing_cadence" required defaultValue={deal?.billing_cadence ?? "monthly"}>
            <option value="one_time">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="bimonthly">Every 2 months</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </Field>
        <Field label="Next charge">
          <input className={inputClass} name="next_payment_at" type="date" defaultValue={deal?.next_payment_at ?? ""} />
        </Field>
        <Field label="Account notes">
          <input className={inputClass} name="notes" defaultValue={deal?.notes ?? ""} placeholder="Delivery expectations, renewal context…" />
        </Field>
      </div>
      {state.error && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-muted">
        Saving terms automatically creates scheduled payment events through the contract end date.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}
