-- CRM Oeiras360 MVP schema
create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  -- "Cargo" is present in Notion but empty in every exported row.
  job_title text,
  email text,
  phone text,
  website text,
  linkedin_url text,
  source text,
  -- "Funil" is the authoritative pipeline property from Notion.
  funnel_stage text not null default 'Lead'
    constraint leads_funnel_stage_check
    check (
      funnel_stage in (
        'Lead',
        'Contacted',
        'Engaged',
        'Negotiation',
        'Closed - Won',
        'Closed - On Hold',
        'Closed - Lost'
      )
    ),
  icp text not null,
  location text not null,
  notes text,
  -- Scores include both decimal values (0.6, 0.8) and integers (1-5), so preserve them.
  lead_score numeric(6, 2),
  -- Notion exports multi-select tags as comma-separated text; import them as text[].
  tags text[] not null default '{}',
  -- The export contains date-only values, not timestamps.
  last_contacted_at date,
  preferred_channel text
    constraint leads_preferred_channel_check
    check (preferred_channel is null or preferred_channel in ('Email', 'Telefone')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel text not null
    constraint contact_templates_channel_check
    check (channel in ('email', 'linkedin')),
  subject text,
  body text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.battlesheet_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_funnel_stage_idx on public.leads (funnel_stage);
create index if not exists leads_icp_idx on public.leads (icp);
create index if not exists leads_location_idx on public.leads (location);
create index if not exists leads_last_contacted_at_idx on public.leads (last_contacted_at);
create index if not exists contact_templates_channel_idx on public.contact_templates (channel);
create index if not exists battlesheet_sections_sort_order_idx
  on public.battlesheet_sections (sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_contact_templates_updated_at on public.contact_templates;
create trigger set_contact_templates_updated_at
before update on public.contact_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_battlesheet_sections_updated_at on public.battlesheet_sections;
create trigger set_battlesheet_sections_updated_at
before update on public.battlesheet_sections
for each row execute function public.set_updated_at();

-- Enable RLS now so the schema is safe when Auth is connected.
-- Add policies once the MVP's ownership model is defined.
alter table public.leads enable row level security;
alter table public.contact_templates enable row level security;
alter table public.battlesheet_sections enable row level security;
