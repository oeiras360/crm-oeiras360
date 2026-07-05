import type { BillingCadence } from "@/types/crm";

export function formatMoney(amountCents: number | null, currency = "EUR") {
  if (amountCents === null) return "Not set";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function formatDate(value: string | null, fallback = "Not set") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function cadenceLabel(cadence: BillingCadence | null) {
  const labels: Record<BillingCadence, string> = {
    one_time: "One-time",
    monthly: "Monthly",
    bimonthly: "Every 2 months",
    quarterly: "Quarterly",
    annually: "Annually",
  };
  return cadence ? labels[cadence] : "Not set";
}

export function contractProgress(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  const now = Date.now();
  if (endTime <= startTime) return 100;
  return Math.max(0, Math.min(100, ((now - startTime) / (endTime - startTime)) * 100));
}
