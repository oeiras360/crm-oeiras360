"use client";

import { useState, useTransition } from "react";
import {
  markPaymentPaidAction,
  markPaymentScheduledAction,
} from "@/app/clients/actions";
import { formatMoney } from "@/lib/client-format";
import type { PaymentEvent } from "@/types/crm";

export function PaymentChip({ event }: { event: PaymentEvent }) {
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const paid = event.status === "paid";

  return (
    <button
      type="button"
      disabled={isPending}
      title={
        failed
          ? "Could not update — try again"
          : paid
            ? `Paid — click to mark as scheduled`
            : `Click to mark as paid`
      }
      onClick={() => {
        setFailed(false);
        startTransition(async () => {
          const action = paid ? markPaymentScheduledAction : markPaymentPaidAction;
          const result = await action(event.id);
          if (result.error) setFailed(true);
        });
      }}
      className={`w-full overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] leading-tight transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:opacity-50 ${
        paid
          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
          : event.status === "overdue"
            ? "border-rose-500 bg-rose-50 text-rose-800"
            : "border-blue-500 bg-blue-50 text-blue-800"
      }`}
    >
      <p className="truncate font-semibold">{event.company_name}</p>
      <p className="mt-0.5 truncate">
        {isPending ? "Saving…" : formatMoney(event.amount_cents, event.currency)}
      </p>
    </button>
  );
}
