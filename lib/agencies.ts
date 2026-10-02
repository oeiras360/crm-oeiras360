import "server-only";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityType, Agency, AgencyActivity, AgencyStage } from "@/types/crm";

type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function getAgencies(): Promise<QueryResult<Agency[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("agencies")
    .select("*")
    .order("company_name");

  if (error) return { data: null, error: error.message };
  return { data: data as Agency[], error: null };
}

export async function updateAgencyStage(
  agencyId: string,
  stage: AgencyStage,
): Promise<QueryResult<Agency>> {
  const { data, error } = await getSupabaseAdminClient()
    .from("agencies")
    .update({ funnel_stage: stage })
    .eq("id", agencyId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Agency no longer exists." };
  return { data: data as Agency, error: null };
}

export async function getAgencyActivities(
  agencyId: string,
): Promise<QueryResult<AgencyActivity[]>> {
  const { data, error } = await getSupabaseServerClient()
    .from("agency_activities")
    .select("*")
    .eq("agency_id", agencyId)
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) return { data: null, error: error.message };
  return { data: data as AgencyActivity[], error: null };
}

export async function logAgencyActivity(
  agencyId: string,
  type: ActivityType,
  body: string | null,
): Promise<QueryResult<AgencyActivity>> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("agency_activities")
    .insert({ agency_id: agencyId, type, body })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  // Outreach touches keep the agency's "last contacted" honest.
  if (["email", "call", "linkedin", "meeting"].includes(type)) {
    await admin
      .from("agencies")
      .update({ last_contacted_at: new Date().toISOString().slice(0, 10) })
      .eq("id", agencyId);
  }

  return { data: data as AgencyActivity, error: null };
}
