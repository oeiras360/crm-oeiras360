import "server-only";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BillingCadence,
  ClientAccount,
  ClientStatus,
  PaymentEvent,
  PaymentStatus,
} from "@/types/crm";

type Result<T> = { data: T; warning: string | null };

interface WonLeadRow {
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
  status: ClientStatus;
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

export async function getWonClients(): Promise<Result<ClientAccount[]>> {
  const client = getSupabaseServerClient();
  const { data: leads, error: leadsError } = await client
    .from("leads")
    .select("id, company_name, contact_name, email, phone, website, notes")
    .eq("funnel_stage", "Closed - Won")
    .order("company_name");

  if (leadsError) return { data: [], warning: leadsError.message };

  const wonLeads = (leads ?? []) as WonLeadRow[];
  if (wonLeads.length === 0) return { data: [], warning: null };

  const { data: deals, error: dealsError } = await getSupabaseAdminClient()
    .from("client_deals")
    .select("*")
    .in("lead_id", wonLeads.map((lead) => lead.id));

  const dealsByLead = new Map<string, DealRow[]>();
  for (const deal of (deals ?? []) as DealRow[]) {
    dealsByLead.set(deal.lead_id, [...(dealsByLead.get(deal.lead_id) ?? []), deal]);
  }

  return {
    data: wonLeads.map((lead) => {
      const leadDeals = dealsByLead.get(lead.id) ?? [];
      return {
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        notes: lead.notes,
        deals: leadDeals.map((deal) => ({
          id: deal.id,
          lead_id: lead.id,
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          deal_name: deal.deal_name,
          service: deal.service,
          contract_start: deal.contract_start,
          contract_end: deal.contract_end,
          amount_cents: deal.amount_cents,
          currency: deal.currency,
          billing_cadence: deal.billing_cadence,
          next_payment_at: deal.next_payment_at,
          status: deal.status,
          notes: deal.notes,
        })),
      };
    }),
    warning: dealsError
      ? "Commercial terms are not connected yet. Apply the client management migration to enable them."
      : null,
  };
}

export async function getPaymentEvents(): Promise<Result<PaymentEvent[]>> {
  const clients = await getWonClients();
  const configuredDeals = clients.data.flatMap((client) => client.deals);
  if (configuredDeals.length === 0) return { data: [], warning: clients.warning };

  const { data, error } = await getSupabaseAdminClient()
    .from("payment_events")
    .select("*")
    .in("client_deal_id", configuredDeals.map((deal) => deal.id))
    .order("due_date");

  if (error) return { data: [], warning: error.message };
  const clientNames = new Map(configuredDeals.map((deal) => [deal.id, deal.company_name]));

  return {
    data: ((data ?? []) as PaymentRow[]).map((event) => ({
      ...event,
      company_name: clientNames.get(event.client_deal_id) ?? "Client",
    })),
    warning: clients.warning,
  };
}

export async function getWonClient(id: string) {
  const result = await getWonClients();
  return {
    data: result.data.find((client) => client.id === id) ?? null,
    warning: result.warning,
  };
}
