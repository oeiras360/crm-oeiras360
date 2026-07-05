"use client";

import { useState, useTransition } from "react";
import {
  markPaymentPaidAction,
  markPaymentScheduledAction,
} from "@/app/clients/actions";
import { formatDate, formatMoney } from "@/lib/client-format";
import type { PaymentEvent } from "@/types/crm";

const statusStyles: Record<PaymentEvent["status"], string> = {
  scheduled: "bg-neutral-100 text-neutral-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

export function DealPayments({ payments }: { payments: PaymentEvent[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (payments.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
        No charges scheduled yet. Set a next charge date on the contract to
        generate the payment plan.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {error && (
        <p role="alert" className="mb-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {payments.map((payment) => {
          const isPending = pendingId === payment.id;
          return (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {formatDate(payment.due_date)}
                </p>
                <p className="truncate text-xs text-muted">{payment.label}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(payment.amount_cents, payment.currency)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[payment.status]}`}
                >
                  {payment.status}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    setPendingId(payment.id);
                    startTransition(async () => {
                      const action =
                        payment.status === "paid"
                          ? markPaymentScheduledAction
                          : markPaymentPaidAction;
                      const result = await action(payment.id);
                      setPendingId(null);
                      if (result.error) setError(result.error);
                    });
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:opacity-50 ${
                    payment.status === "paid"
                      ? "text-neutral-500 hover:bg-neutral-100"
                      : "bg-emerald-700 text-white hover:bg-emerald-800"
                  }`}
                >
                  {isPending
                    ? "Saving…"
                    : payment.status === "paid"
                      ? "Undo"
                      : "Mark paid"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
