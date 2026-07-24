"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { deriveDealStatus } from "@/lib/clients";
import type {
  BillingCadence,
  ClientAccount,
  ClientDeal,
  PaymentEvent,
  PaymentStatus,
} from "@/types/crm";

const cadences = new Set<BillingCadence>([
  "one_time",
  "monthly",
  "bimonthly",
  "quarterly",
  "annually",
]);

export interface DealFormState {
  error: string | null;
  savedDealId: string | null;
  savedAt: number | null;
}

export async function saveClientDeal(
  leadId: string,
  dealId: string | null,
  _previousState: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  if (!UUID_PATTERN.test(leadId) || (dealId !== null && !UUID_PATTERN.test(dealId))) {
    return { error: "Invalid contract identifier.", savedDealId: null, savedAt: null };
  }

  const dealName = String(formData.get("deal_name") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const contractStart = String(formData.get("contract_start") ?? "");
  const contractEnd = String(formData.get("contract_end") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  const cadence = String(formData.get("billing_cadence") ?? "") as BillingCadence;
  const nextPayment = String(formData.get("next_payment_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (
    !dealName ||
    !service ||
    !contractStart ||
    !contractEnd ||
    !amountRaw ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !cadences.has(cadence)
  ) {
    return {
      error: "Complete all required commercial terms.",
      savedDealId: null,
      savedAt: null,
    };
  }

  if (contractEnd < contractStart) {
    return {
      error: "Contract end date must be on or after the start date.",
      savedDealId: null,
      savedAt: null,
    };
  }

  if (nextPayment && (nextPayment < contractStart || nextPayment > contractEnd)) {
    return {
      error: "Next charge must fall within the contract period.",
      savedDealId: null,
      savedAt: null,
    };
  }

  const admin = getSupabaseAdminClient();
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) {
    return { error: leadError.message, savedDealId: null, savedAt: null };
  }
  if (!lead) {
    return { error: "Lead no longer exists.", savedDealId: null, savedAt: null };
  }

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
    ? admin
        .from("client_deals")
        .update(values)
        .eq("id", dealId)
        .eq("lead_id", leadId)
    : admin.from("client_deals").insert(values);
  const { data: deal, error } = await query
    .select("id")
    .single();

  if (error || !deal) {
    return {
      error: error?.message.includes("client_deals_dates_check")
        ? "Contract end date must be on or after the start date."
        : error?.message ?? "Could not save the deal.",
      savedDealId: null,
      savedAt: null,
    };
  }

  // Only replace future/scheduled events belonging to this exact contract.
  // Paid events remain as immutable billing history, and other contracts are
  // never touched.
  const { error: deleteError } = await admin
    .from("payment_events")
    .delete()
    .eq("client_deal_id", deal.id)
    .eq("status", "scheduled");
  if (deleteError) {
    return { error: deleteError.message, savedDealId: null, savedAt: null };
  }

  if (nextPayment) {
    const { data: paidEvents, error: paidEventsError } = await admin
      .from("payment_events")
      .select("due_date")
      .eq("client_deal_id", deal.id)
      .eq("status", "paid");
    if (paidEventsError) {
      return { error: paidEventsError.message, savedDealId: null, savedAt: null };
    }
    const paidDates = new Set(
      ((paidEvents ?? []) as Array<{ due_date: string }>).map((event) => event.due_date),
    );
    const dueDates = buildDueDates(nextPayment, contractEnd, cadence).filter(
      (dueDate) => !paidDates.has(dueDate),
    );
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
      if (paymentError) {
        return { error: paymentError.message, savedDealId: null, savedAt: null };
      }
    }
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${leadId}`);
  revalidatePath("/clients/calendar");
  revalidatePath("/pipeline");
  revalidatePath("/finance");
  revalidatePath("/crm");
  return { error: null, savedDealId: deal.id, savedAt: Date.now() };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LeadContractBundle {
  account: ClientAccount;
  payments: PaymentEvent[];
}

interface LeadRow {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

interface DealRow {
  id: string;
  lead_id: string;
  deal_name: string | null;
  service: string | null;
  contract_start: string | null;
  contract_end: string | null;
  amount_cents: number | null;
  currency: string;
  billing_cadence: BillingCadence | null;
  next_payment_at: string | null;
  status: ClientDeal["status"];
  notes: string | null;
}

interface PaymentRow {
  id: string;
  client_deal_id: string;
  due_date: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  label: string;
}

export async function getLeadContractsAction(
  leadId: string,
): Promise<{ data: LeadContractBundle | null; error: string | null }> {
  if (!UUID_PATTERN.test(leadId)) {
    return { data: null, error: "Invalid lead identifier." };
  }

  const admin = getSupabaseAdminClient();
  const [{ data: lead, error: leadError }, { data: deals, error: dealsError }] =
    await Promise.all([
      admin
        .from("leads")
        .select("id, company_name, contact_name, email, phone, website, notes")
        .eq("id", leadId)
        .maybeSingle(),
      admin
        .from("client_deals")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at"),
    ]);

  if (leadError || dealsError) {
    return { data: null, error: leadError?.message ?? dealsError?.message ?? "Could not load contracts." };
  }
  if (!lead) return { data: null, error: "Lead no longer exists." };

  const leadRow = lead as LeadRow;
  const dealRows = (deals ?? []) as DealRow[];
  const clientDeals: ClientDeal[] = dealRows.map((deal) => ({
    ...deal,
    company_name: leadRow.company_name,
    contact_name: leadRow.contact_name,
    email: leadRow.email,
    phone: leadRow.phone,
    website: leadRow.website,
    status: deriveDealStatus(deal.contract_end),
  }));

  let payments: PaymentEvent[] = [];
  if (dealRows.length > 0) {
    const { data: paymentRows, error: paymentError } = await admin
      .from("payment_events")
      .select("*")
      .in("client_deal_id", dealRows.map((deal) => deal.id))
      .order("due_date");
    if (paymentError) return { data: null, error: paymentError.message };

    const today = new Date().toISOString().slice(0, 10);
    payments = ((paymentRows ?? []) as PaymentRow[]).map((payment) => ({
      ...payment,
      company_name: leadRow.company_name,
      status:
        payment.status === "scheduled" && payment.due_date < today
          ? "overdue"
          : payment.status,
    }));
  }

  return {
    data: {
      account: {
        id: leadRow.id,
        company_name: leadRow.company_name,
        contact_name: leadRow.contact_name,
        email: leadRow.email,
        phone: leadRow.phone,
        website: leadRow.website,
        notes: leadRow.notes,
        deals: clientDeals,
      },
      payments,
    },
    error: null,
  };
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
  if (!UUID_PATTERN.test(dealId)) return { error: "Invalid contract identifier." };

  // payment_events cascades on deal delete.
  const { error } = await getSupabaseAdminClient()
    .from("client_deals")
    .delete()
    .eq("id", dealId);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/clients/calendar");
  revalidatePath("/finance");
  revalidatePath("/pipeline");
  revalidatePath("/crm");
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
