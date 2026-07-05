import "server-only";

import { getPaymentEvents } from "@/lib/clients";
import type { PaymentEvent } from "@/types/crm";

export interface MonthlyForecast {
  key: string;
  label: string;
  amount_cents: number;
  payment_count: number;
  events: PaymentEvent[];
}

export async function getFinancialDashboard() {
  const result = await getPaymentEvents();
  const now = new Date();
  const months: MonthlyForecast[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(date),
      amount_cents: 0,
      payment_count: 0,
      events: [],
    };
  });

  const monthByKey = new Map(months.map((month) => [month.key, month]));
  const clientTotals = new Map<string, number>();

  for (const event of result.data) {
    clientTotals.set(
      event.company_name,
      (clientTotals.get(event.company_name) ?? 0) + event.amount_cents,
    );
    const month = monthByKey.get(event.due_date.slice(0, 7));
    if (month && event.status !== "paid") {
      month.amount_cents += event.amount_cents;
      month.payment_count += 1;
      month.events.push(event);
    }
  }

  const collected = result.data
    .filter((event) => event.status === "paid")
    .reduce((sum, event) => sum + event.amount_cents, 0);
  const overdue = result.data
    .filter((event) => event.status === "overdue")
    .reduce((sum, event) => sum + event.amount_cents, 0);
  const outstanding = result.data
    .filter((event) => event.status !== "paid")
    .reduce((sum, event) => sum + event.amount_cents, 0);
  const accumulatedWon = collected + outstanding;

  return {
    months,
    collected,
    overdue,
    outstanding,
    accumulatedWon,
    sixMonthForecast: months.reduce((sum, month) => sum + month.amount_cents, 0),
    topClients: [...clientTotals.entries()]
      .map(([company_name, amount_cents]) => ({ company_name, amount_cents }))
      .sort((a, b) => b.amount_cents - a.amount_cents)
      .slice(0, 5),
    warning: result.warning,
  };
}
