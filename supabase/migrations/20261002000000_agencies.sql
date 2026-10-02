-- Agências vertical: a separate, simpler funnel for agencies whose clients
-- could sponsor Oeiras360. Mirrors leads / lead_activities but stands alone —
-- no client_deals promotion, no n8n import view.
--
-- Built against the live schema (set_updated_at() already exists live; leads
-- tables have RLS off with grants to anon/authenticated/service_role).

begin;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  job_title text,
  email text,
  phone text,
  website text,
  linkedin_url text,
  source text,
  funnel_stage text not null default 'lead'
    constraint agencies_funnel_stage_check
    check (funnel_stage in ('lead', 'contactado', 'engagemento', 'reuniao', 'acordo', 'perdido')),
  notes text,
  tags text[] not null default '{}',
  last_contacted_at date,
  next_action_at date,
  next_action_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agencies_funnel_stage_idx on public.agencies (funnel_stage);
create index agencies_next_action_at_idx on public.agencies (next_action_at);

create trigger set_agencies_updated_at
before update on public.agencies
for each row execute function public.set_updated_at();

create table public.agency_activities (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  type text not null
    constraint agency_activities_type_check
    check (type in ('note', 'email', 'call', 'linkedin', 'meeting', 'stage_change')),
  body text,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index agency_activities_agency_id_occurred_at_idx
  on public.agency_activities (agency_id, occurred_at desc);

create or replace function public.log_agency_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_activities (agency_id, type, body, metadata)
  values (
    new.id,
    'stage_change',
    old.funnel_stage || ' → ' || new.funnel_stage,
    jsonb_build_object('from', old.funnel_stage, 'to', new.funnel_stage)
  );
  return new;
end;
$$;

create trigger log_agency_stage_change
after update of funnel_stage on public.agencies
for each row
when (old.funnel_stage is distinct from new.funnel_stage)
execute function public.log_agency_stage_change();

grant select, insert, update, delete on public.agencies to anon, authenticated, service_role;
grant select, insert, update, delete on public.agency_activities to anon, authenticated, service_role;

commit;
