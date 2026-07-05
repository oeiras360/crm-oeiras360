"use server";

import { revalidatePath } from "next/cache";
import { updateLeadFunnel } from "@/lib/supabase/queries";
import { FUNNEL_STAGES, type FunnelStage, type Lead } from "@/types/crm";

type UpdateLeadFunnelResult =
  | { data: Lead; error: null }
  | { data: null; error: string };

export async function updateLeadFunnelAction(
  leadId: string,
  funnelStage: string,
): Promise<UpdateLeadFunnelResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
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
