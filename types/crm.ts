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

export const ACTIVITY_TYPES = [
  "note",
  "email",
  "call",
  "linkedin",
  "meeting",
  "stage_change",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: ActivityType;
  body: string | null;
  metadata: Record<string, string>;
  occurred_at: string;
  created_at: string;
}

export interface Lead {
  id: string;
  identity_key: string | null;
  company_name: string;
  contact_name: string;
  job_title: string | null;
  email: string | null;
  second_email: boolean;
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
  next_action_at: string | null;
  next_action_note: string | null;
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

export type BillingCadence =
  | "one_time"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "annually";
export type ClientStatus = "active" | "ending_soon" | "completed";
export type PaymentStatus = "scheduled" | "paid" | "overdue";

export interface ClientDeal {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
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

export interface ClientAccount {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  deals: ClientDeal[];
}

export interface PaymentEvent {
  id: string;
  client_deal_id: string;
  company_name: string;
  due_date: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  label: string;
}
