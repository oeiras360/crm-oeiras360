"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { BillingCadence } from "@/types/crm";

const cadences = new Set<BillingCadence>([
  "one_time",
  "monthly",
  "bimonthly",
  "quarterly",
  "annually",
]);

export interface DealFormState {
  error: string | null;
}

export async function saveClientDeal(
  leadId: string,
  dealId: string | null,
  _previousState: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const dealName = String(formData.get("deal_name") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const contractStart = String(formData.get("contract_start") ?? "");
  const contractEnd = String(formData.get("contract_end") ?? "");
  const amount = Number(formData.get("amount"));
  const cadence = String(formData.get("billing_cadence") ?? "") as BillingCadence;
  const nextPayment = String(formData.get("next_payment_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (
    !dealName ||
    !service ||
    !contractStart ||
    !contractEnd ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !cadences.has(cadence)
  ) {
    return { error: "Complete all required commercial terms." };
  }

  if (contractEnd < contractStart) {
    return { error: "Contract end date must be on or after the start date." };
  }

  if (nextPayment && (nextPayment < contractStart || nextPayment > contractEnd)) {
    return { error: "Next charge must fall within the contract period." };
  }

  const admin = getSupabaseAdminClient();
  const values = {
    lead_id: leadId,
    deal_name: dealName,
    service,
    contract_start: contractStart,
    contract_end: contractEnd,
    amount_cents: Math.round(amount * 100),
    currency: "EUR",
    billing_cadence: cadence,
    next_payment_at: nextPayment || null,
    status: "active",
    notes,
    updated_at: new Date().toISOString(),
  };
  const query = dealId
    ? admin.from("client_deals").update(values).eq("id", dealId)
    : admin.from("client_deals").insert(values);
  const { data: deal, error } = await query
    .select("id")
    .single();

  if (error || !deal) {
    return {
      error: error?.message.includes("client_deals_dates_check")
        ? "Contract end date must be on or after the start date."
        : error?.message ?? "Could not save the deal.",
    };
  }

  if (nextPayment) {
    const dueDates = buildDueDates(nextPayment, contractEnd, cadence);
    await admin
      .from("payment_events")
      .delete()
      .eq("client_deal_id", deal.id)
      .eq("status", "scheduled");

    if (dueDates.length) {
      const { error: paymentError } = await admin.from("payment_events").insert(
        dueDates.map((dueDate) => ({
          client_deal_id: deal.id,
          due_date: dueDate,
          amount_cents: Math.round(amount * 100),
          currency: "EUR",
          status: "scheduled",
          label: service,
        })),
      );
      if (paymentError) return { error: paymentError.message };
    }
  }

  revalidatePath("/clients");
  revalidatePath("/clients/calendar");
  redirect(`/clients/${leadId}`);
}

export async function markPaymentPaidAction(
  eventId: string,
): Promise<{ error: string | null }> {
  const { error } = await getSupabaseAdminClient()
    .from("payment_events")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/clients/calendar");
  revalidatePath("/finance");
  revalidatePath("/crm");
  return { error: null };
}

export async function markPaymentScheduledAction(
  eventId: string,
): Promise<{ error: string | null }> {
  const { error } = await getSupabaseAdminClient()
    .from("payment_events")
    .update({ status: "scheduled", paid_at: null })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/clients/calendar");
  revalidatePath("/finance");
  revalidatePath("/crm");
  return { error: null };
}

export async function deleteDealAction(
  dealId: string,
): Promise<{ error: string | null }> {
  // payment_events cascades on deal delete.
  const { error } = await getSupabaseAdminClient()
    .from("client_deals")
    .delete()
    .eq("id", dealId);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/clients/calendar");
  revalidatePath("/finance");
  return { error: null };
}

function buildDueDates(start: string, end: string, cadence: BillingCadence) {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00Z`);
  const final = new Date(`${end}T12:00:00Z`);
  const months =
    cadence === "monthly"
      ? 1
      : cadence === "bimonthly"
        ? 2
        : cadence === "quarterly"
          ? 3
          : 12;

  while (
    (cadence === "one_time" ? current <= final : current < final) &&
    dates.length < 120
  ) {
    dates.push(current.toISOString().slice(0, 10));
    if (cadence === "one_time") break;
    current.setUTCMonth(current.getUTCMonth() + months);
  }
  return dates;
}
