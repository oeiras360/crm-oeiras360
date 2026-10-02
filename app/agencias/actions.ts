"use server";

import { revalidatePath } from "next/cache";
import {
  getAgencyActivities,
  logAgencyActivity,
  updateAgencyStage,
} from "@/lib/agencies";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ACTIVITY_TYPES,
  AGENCY_STAGES,
  type ActivityType,
  type Agency,
  type AgencyActivity,
  type AgencyStage,
} from "@/types/crm";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateAgencyStageAction(
  agencyId: string,
  stage: string,
): Promise<{ data: Agency; error: null } | { data: null; error: string }> {
  if (!UUID_PATTERN.test(agencyId)) {
    return { data: null, error: "Invalid agency identifier." };
  }
  if (!AGENCY_STAGES.includes(stage as AgencyStage)) {
    return { data: null, error: "Invalid stage." };
  }

  const result = await updateAgencyStage(agencyId, stage as AgencyStage);
  if (result.data) revalidatePath("/agencias");
  return result;
}

export interface AgencyFormState {
  error: string | null;
  agency: Agency | null;
}

export async function saveAgencyAction(
  agencyId: string | null,
  _previousState: AgencyFormState,
  formData: FormData,
): Promise<AgencyFormState> {
  if (agencyId !== null && !UUID_PATTERN.test(agencyId)) {
    return { error: "Invalid agency identifier.", agency: null };
  }

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;

  const companyName = text("company_name");
  const contactName = text("contact_name");
  const stage = text("funnel_stage");
  const tags = text("tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!companyName || !contactName) {
    return { error: "Agency and contact name are required.", agency: null };
  }
  if (!AGENCY_STAGES.includes(stage as AgencyStage)) {
    return { error: "Invalid stage.", agency: null };
  }

  const values = {
    company_name: companyName,
    contact_name: contactName,
    job_title: optional("job_title"),
    email: optional("email"),
    phone: optional("phone"),
    website: optional("website"),
    linkedin_url: optional("linkedin_url"),
    source: optional("source"),
    funnel_stage: stage,
    notes: optional("notes"),
    tags,
    last_contacted_at: optional("last_contacted_at"),
  };

  const admin = getSupabaseAdminClient();
  const query = agencyId
    ? admin.from("agencies").update(values).eq("id", agencyId)
    : admin.from("agencies").insert(values);
  const { data: agency, error } = await query.select("*").maybeSingle();

  if (error) return { error: error.message, agency: null };
  if (!agency) return { error: "Agency no longer exists.", agency: null };

  revalidatePath("/agencias");
  return { error: null, agency: agency as Agency };
}

export async function getAgencyActivitiesAction(
  agencyId: string,
): Promise<{ data: AgencyActivity[] | null; error: string | null }> {
  if (!UUID_PATTERN.test(agencyId)) {
    return { data: null, error: "Invalid agency identifier." };
  }
  return getAgencyActivities(agencyId);
}

export async function logAgencyActivityAction(
  agencyId: string,
  type: string,
  body: string,
): Promise<{ data: AgencyActivity | null; error: string | null }> {
  if (!UUID_PATTERN.test(agencyId)) {
    return { data: null, error: "Invalid agency identifier." };
  }
  if (!ACTIVITY_TYPES.includes(type as ActivityType) || type === "stage_change") {
    return { data: null, error: "Invalid activity type." };
  }
  const trimmed = body.trim();
  if (!trimmed) {
    return { data: null, error: "Write a short note about what happened." };
  }

  const result = await logAgencyActivity(agencyId, type as ActivityType, trimmed);
  if (result.data) revalidatePath("/agencias");
  return result;
}

export async function setAgencyNextActionAction(
  agencyId: string,
  nextActionAt: string,
  note: string,
): Promise<{ data: Agency | null; error: string | null }> {
  if (!UUID_PATTERN.test(agencyId)) {
    return { data: null, error: "Invalid agency identifier." };
  }
  if (nextActionAt && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionAt)) {
    return { data: null, error: "Invalid date." };
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("agencies")
    .update({
      next_action_at: nextActionAt || null,
      next_action_note: note.trim() || null,
    })
    .eq("id", agencyId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Agency no longer exists." };

  revalidatePath("/agencias");
  return { data: data as Agency, error: null };
}

export async function deleteAgencyAction(
  agencyId: string,
): Promise<{ error: string | null }> {
  if (!UUID_PATTERN.test(agencyId)) {
    return { error: "Invalid agency identifier." };
  }

  const { error } = await getSupabaseAdminClient()
    .from("agencies")
    .delete()
    .eq("id", agencyId);

  if (error) return { error: error.message };

  revalidatePath("/agencias");
  return { error: null };
}
