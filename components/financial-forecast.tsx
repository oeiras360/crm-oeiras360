"use client";

import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/client-format";
import type { MonthlyForecast } from "@/lib/finance";

export function FinancialForecast({ months }: { months: MonthlyForecast[] }) {
  const [selectedKey, setSelectedKey] = useState(months[0]?.key ?? "");
  const selected = months.find((month) => month.key === selectedKey) ?? months[0];
  const maxMonth = Math.max(...months.map((month) => month.amount_cents), 1);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Revenue forecast
          </p>
          <h2 className="mt-2 text-xl font-semibold">Expected by month</h2>
        </div>
        <p className="text-xs text-muted">Select a month to see who to charge</p>
      </div>

      <div className="mt-8 grid h-72 grid-cols-6 items-end gap-3 sm:gap-5">
        {months.map((month) => {
          const height = month.amount_cents
            ? Math.max(12, (month.amount_cents / maxMonth) * 100)
            : 2;
          const selectedMonth = month.key === selected?.key;
          return (
            <button
              key={month.key}
              type="button"
              onClick={() => setSelectedKey(month.key)}
              className="group flex h-full min-w-0 flex-col justify-end rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-pressed={selectedMonth}
              aria-label={`${month.label}: ${formatMoney(month.amount_cents)}, ${month.payment_count} payments`}
            >
              <span className="mb-2 truncate text-center font-mono text-[10px] font-semibold text-neutral-700 sm:text-xs">
                {month.amount_cents ? formatMoney(month.amount_cents) : "—"}
              </span>
              <span
                className={`flex h-52 items-end rounded-lg px-1.5 transition sm:px-3 ${
                  selectedMonth ? "bg-emerald-50 ring-2 ring-emerald-600" : "bg-neutral-50 group-hover:bg-neutral-100"
                }`}
              >
                <span
                  className={`w-full rounded-t-md transition-all ${
                    month.amount_cents ? "bg-emerald-600" : "bg-neutral-200"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span className={`mt-3 text-center text-[10px] font-medium sm:text-xs ${selectedMonth ? "text-emerald-700" : "text-muted"}`}>
                {month.label}
              </span>
              <span className="mt-1 text-center text-[10px] text-neutral-400">
                {month.payment_count} {month.payment_count === 1 ? "payment" : "payments"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 border-t border-border pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {selected?.label}
            </p>
            <h3 className="mt-1 font-semibold">Clients to charge</h3>
          </div>
          <p className="font-mono text-lg font-semibold">
            {formatMoney(selected?.amount_cents ?? 0)}
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {selected?.events.length ? (
            selected.events.map((event) => (
              <article key={event.id} className="rounded-xl border border-border bg-neutral-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{event.company_name}</p>
                    <p className="mt-1 truncate text-xs text-muted">{event.label}</p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold">
                    {formatMoney(event.amount_cents, event.currency)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-neutral-500">Charge on {formatDate(event.due_date)}</p>
              </article>
            ))
          ) : (
            <p className="col-span-2 rounded-xl bg-neutral-50 p-4 text-sm text-muted">
              No charges scheduled for this month.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
