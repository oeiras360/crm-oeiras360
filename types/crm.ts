export const FUNNEL_STAGES = [
  "Lead",
  "Contacted",
  "Engaged",
  "Negotiation",
  "Closed - Won",
  "Closed - On Hold",
  "Closed - Lost",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export type LeadChannel = "Email" | "Telefone";
export type ContactChannel = "email" | "linkedin";

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  source: string | null;
  funnel_stage: FunnelStage;
  icp: string;
  location: string;
  notes: string | null;
  lead_score: number | null;
  tags: string[];
  last_contacted_at: string | null;
  preferred_channel: LeadChannel | null;
  created_at: string;
  updated_at: string;
}

export interface ContactTemplate {
  id: string;
  title: string;
  channel: ContactChannel;
  subject: string | null;
  body: string;
  category: string | null;
  status: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface BattlesheetSection {
  id: string;
  title: string;
  slug: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
