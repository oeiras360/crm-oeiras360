import "server-only";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityType, Lead, LeadActivity } from "@/types/crm";

type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface RecentActivity extends LeadActivity {
  company_name: string;
}

const ACTIVE_STAGES = ["Lead", "Contacted", "Engaged", "Negotiation"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function getLeadActivities(
  leadId: string,
): Promise<QueryResult<LeadActivity[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) return { data: null, error: error.message };
  return { data: data as LeadActivity[], error: null };
}

export async function getRecentActivities(
  limit = 10,
): Promise<QueryResult<RecentActivity[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("lead_activities")
    .select("*, leads(company_name)")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };

  return {
    data: (data as (LeadActivity & { leads: { company_name: string } | null })[]).map(
      ({ leads, ...activity }) => ({
        ...activity,
        company_name: leads?.company_name ?? "Lead",
      }),
    ),
    error: null,
  };
}

export async function logActivity(
  leadId: string,
  type: ActivityType,
  body: string | null,
  occurredAt?: string,
): Promise<QueryResult<LeadActivity>> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      type,
      body,
      ...(occurredAt ? { occurred_at: occurredAt } : {}),
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  // Outreach touches keep the lead's "last contacted" honest.
  if (["email", "call", "linkedin", "meeting"].includes(type)) {
    await admin
      .from("leads")
      .update({ last_contacted_at: (occurredAt ?? new Date().toISOString()).slice(0, 10) })
      .eq("id", leadId);
  }

  return { data: data as LeadActivity, error: null };
}

export async function getFollowUps(): Promise<QueryResult<Lead[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("leads")
    .select("*")
    .lte("next_action_at", todayISO())
    .in("funnel_stage", ACTIVE_STAGES)
    .order("next_action_at");

  if (error) return { data: null, error: error.message };
  return { data: data as Lead[], error: null };
}

export async function getStaleLeads(days = 14): Promise<QueryResult<Lead[]>> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await getSupabaseServerClient()
    .from("leads")
    .select("*")
    .in("funnel_stage", ACTIVE_STAGES)
    .is("next_action_at", null)
    .or(`last_contacted_at.lte.${cutoff},last_contacted_at.is.null`)
    .order("lead_score", { ascending: false, nullsFirst: false });

  if (error) return { data: null, error: error.message };
  return { data: data as Lead[], error: null };
}
