"use server";

import { revalidatePath } from "next/cache";
import { computeIdentityKey } from "@/lib/leads";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { updateLeadFunnel } from "@/lib/supabase/queries";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UpdateLeadFunnelResult =
  | { data: Lead; error: null }
  | { data: null; error: string };

export async function updateLeadFunnelAction(
  leadId: string,
  funnelStage: string,
): Promise<UpdateLeadFunnelResult> {
  if (!UUID_PATTERN.test(leadId)) {
    return { data: null, error: "Invalid lead identifier." };
  }
  if (!FUNNEL_STAGES.includes(funnelStage as FunnelStage)) {
    return { data: null, error: "Invalid funnel stage." };
  }

  const result = await updateLeadFunnel(leadId, funnelStage as FunnelStage);
  if (!result.data) return result;

  revalidatePath("/pipeline");
  revalidatePath("/crm");
  return result;
}

export interface LeadFormState {
  error: string | null;
  lead: Lead | null;
}

export async function saveLeadAction(
  leadId: string | null,
  _previousState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  if (leadId !== null && !UUID_PATTERN.test(leadId)) {
    return { error: "Invalid lead identifier.", lead: null };
  }

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;

  const companyName = text("company_name");
  const contactName = text("contact_name");
  const icp = text("icp");
  const location = text("location");
  const funnelStage = text("funnel_stage");
  const scoreRaw = text("lead_score").replace(",", ".");
  const leadScore = scoreRaw ? Number(scoreRaw) : null;
  const channel = text("preferred_channel");
  const lastContacted = text("last_contacted_at");
  const tags = text("tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!companyName || !contactName || !icp || !location) {
    return { error: "Company, contact, ICP and location are required.", lead: null };
  }
  if (!FUNNEL_STAGES.includes(funnelStage as FunnelStage)) {
    return { error: "Invalid funnel stage.", lead: null };
  }
  if (leadScore !== null && (!Number.isFinite(leadScore) || leadScore < 0 || leadScore > 9999)) {
    return { error: "Lead score must be a number between 0 and 9999.", lead: null };
  }
  if (channel && channel !== "Email" && channel !== "Telefone") {
    return { error: "Invalid preferred channel.", lead: null };
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
    funnel_stage: funnelStage,
    icp,
    location,
    notes: optional("notes"),
    lead_score: leadScore,
    tags,
    last_contacted_at: lastContacted || null,
    preferred_channel: channel || null,
    identity_key: computeIdentityKey({
      email: optional("email"),
      phone: optional("phone"),
      linkedin_url: optional("linkedin_url"),
      company_name: companyName,
      contact_name: contactName,
    }),
  };

  const admin = getSupabaseAdminClient();
  const query = leadId
    ? admin.from("leads").update(values).eq("id", leadId)
    : admin.from("leads").insert(values);
  const { data: lead, error } = await query.select("*").maybeSingle();

  if (error) {
    return {
      error: error.code === "23505"
        ? "A lead with this contact already exists (same email, phone or LinkedIn)."
        : error.message,
      lead: null,
    };
  }
  if (!lead) return { error: "Lead no longer exists.", lead: null };

  revalidatePath("/pipeline");
  revalidatePath("/crm");
  return { error: null, lead: lead as Lead };
}

export async function deleteLeadAction(
  leadId: string,
): Promise<{ error: string | null }> {
  if (!UUID_PATTERN.test(leadId)) {
    return { error: "Invalid lead identifier." };
  }

  const { error } = await getSupabaseAdminClient()
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (error) {
    return {
      error: error.code === "23503"
        ? "This lead has client contracts — remove the contracts first."
        : error.message,
    };
  }

  revalidatePath("/pipeline");
  revalidatePath("/crm");
  return { error: null };
}
