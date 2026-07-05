-- Promote the Notion import into a first-class `leads` table.
--
-- `leads_import` becomes an updatable VIEW with the same Portuguese columns so
-- the external n8n workflows (lead researcher / lead updater) keep working
-- unchanged. The view's INSTEAD OF INSERT trigger dedups by identity_key,
-- because `INSERT ... ON CONFLICT` (PostgREST upsert) does not work on views —
-- n8n nodes must use plain insert, which the trigger makes idempotent.
--
-- NOTE: tools/sync_notion_csv_to_supabase.py (delete-all + reinsert) is
-- retired by this migration: deleting a won lead now fails on the
-- client_deals FK by design. The CRM is the source of truth from here on.
--
-- Rollback: drop view leads_import; alter table leads_import_backup rename to
-- leads_import; recreate the promotion trigger from 20260705130000. The backup
-- table can be dropped after ~2 weeks of clean n8n runs.

begin;

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Parse helpers (mirror the TS parsers previously in lib/supabase/queries.ts
-- and the identity recipe in tools/sync_notion_csv_to_supabase.py)
-- ---------------------------------------------------------------------------

create or replace function public.parse_notion_date(value text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  m text[];
  mo text;
begin
  if value is null or value = '' then
    return null;
  end if;
  if value ~ '^\d{4}-\d{2}-\d{2}' then
    return substring(value from 1 for 10)::date;
  end if;
  m := regexp_match(value, '^(\d{1,2}) de ([^\s]+) de (\d{4})$', 'i');
  if m is null then
    return null;
  end if;
  mo := ('{"janeiro":"01","fevereiro":"02","março":"03","abril":"04",
          "maio":"05","junho":"06","julho":"07","agosto":"08",
          "setembro":"09","outubro":"10","novembro":"11","dezembro":"12"}'::jsonb)
        ->> lower(m[2]);
  if mo is null then
    return null;
  end if;
  return (m[3] || '-' || mo || '-' || lpad(m[1], 2, '0'))::date;
end;
$$;

create or replace function public.parse_lead_score(value text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when replace(coalesce(value, ''), ',', '.') ~ '^\d+(\.\d+)?$'
    then replace(value, ',', '.')::numeric(6, 2)
  end;
$$;

create or replace function public.parse_tags(value text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (
      select array_agg(trim(t))
      from unnest(string_to_array(coalesce(value, ''), ',')) as t
      where trim(t) <> ''
    ),
    '{}'
  );
$$;

-- Same precedence as tools/sync_notion_csv_to_supabase.py::identity_key:
-- email, then phone (7+ digits), then linkedin (query stripped), then
-- ascii-folded company|contact; sha256 hex over the winner.
create or replace function public.compute_identity_key(
  p_email text,
  p_phone text,
  p_linkedin text,
  p_company text,
  p_contact text
)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(
    digest(
      coalesce(
        nullif(lower(trim(coalesce(p_email, ''))), ''),
        case
          when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
          then regexp_replace(p_phone, '\D', '', 'g')
        end,
        nullif(rtrim(split_part(lower(trim(coalesce(p_linkedin, ''))), '?', 1), '/'), ''),
        regexp_replace(lower(unaccent(coalesce(p_company, ''))), '[^a-z0-9]', '', 'g')
          || '|'
          || regexp_replace(lower(unaccent(coalesce(p_contact, ''))), '[^a-z0-9]', '', 'g')
      ),
      'sha256'
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- The leads table (design from supabase/schema.sql, plus identity_key and
-- next-action follow-up fields)
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  identity_key text unique,
  company_name text not null,
  contact_name text not null,
  job_title text,
  email text,
  phone text,
  website text,
  linkedin_url text,
  source text,
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
  lead_score numeric(6, 2),
  tags text[] not null default '{}',
  last_contacted_at date,
  preferred_channel text
    constraint leads_preferred_channel_check
    check (preferred_channel is null or preferred_channel in ('Email', 'Telefone')),
  next_action_at date,
  next_action_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_funnel_stage_idx on public.leads (funnel_stage);
create index leads_icp_idx on public.leads (icp);
create index leads_location_idx on public.leads (location);
create index leads_last_contacted_at_idx on public.leads (last_contacted_at);
create index leads_next_action_at_idx on public.leads (next_action_at);

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

create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Backfill from leads_import, preserving uuids so client_deals.lead_id holds
-- ---------------------------------------------------------------------------

insert into public.leads (
  id, identity_key, company_name, contact_name, job_title, email, phone,
  website, linkedin_url, source, funnel_stage, icp, location, notes,
  lead_score, tags, last_contacted_at, preferred_channel
)
select
  id,
  identity_key,
  "Empresa",
  "Nome",
  nullif("Cargo", ''),
  nullif("E-mail", ''),
  nullif("Telefone", ''),
  nullif("Site", ''),
  nullif("LinkedIn", ''),
  nullif("Fonte", ''),
  case
    when "Funil" in ('Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
    then "Funil"
    else 'Lead'
  end,
  "ICP",
  "Local",
  nullif("Notas", ''),
  public.parse_lead_score("Pontuação do lead"),
  public.parse_tags("Tags"),
  public.parse_notion_date("Último contato"),
  case when "Canal" in ('Email', 'Telefone') then "Canal" end
from public.leads_import;

-- First real FK on client_deals: a lead with contracts cannot be deleted.
alter table public.client_deals
  add constraint client_deals_lead_id_fkey
  foreign key (lead_id) references public.leads (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Move the won-lead promotion trigger from leads_import to leads
-- ---------------------------------------------------------------------------

drop trigger if exists promote_won_lead_to_client on public.leads_import;

create or replace function public.promote_won_lead_to_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.funnel_stage = 'Closed - Won'
    and not exists (
      select 1 from public.client_deals where lead_id = new.id
    )
  then
    insert into public.client_deals (lead_id, deal_name, status)
    values (new.id, new.company_name, 'active');
  end if;

  return new;
end;
$$;

create trigger promote_won_lead_to_client
after insert or update of funnel_stage on public.leads
for each row
when (new.funnel_stage = 'Closed - Won')
execute function public.promote_won_lead_to_client();

-- ---------------------------------------------------------------------------
-- Activity log: per-lead timeline; stage changes are logged by trigger no
-- matter who moves the stage (app, n8n through the view, or SQL).
-- ---------------------------------------------------------------------------

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null
    constraint lead_activities_type_check
    check (type in ('note', 'email', 'call', 'linkedin', 'meeting', 'stage_change')),
  body text,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index lead_activities_lead_id_occurred_at_idx
  on public.lead_activities (lead_id, occurred_at desc);
create index lead_activities_occurred_at_idx
  on public.lead_activities (occurred_at desc);

create or replace function public.log_lead_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_activities (lead_id, type, body, metadata)
  values (
    new.id,
    'stage_change',
    old.funnel_stage || ' → ' || new.funnel_stage,
    jsonb_build_object('from', old.funnel_stage, 'to', new.funnel_stage)
  );
  return new;
end;
$$;

create trigger log_lead_stage_change
after update of funnel_stage on public.leads
for each row
when (old.funnel_stage is distinct from new.funnel_stage)
execute function public.log_lead_stage_change();

-- ---------------------------------------------------------------------------
-- Swap the import table for a compatibility view (same name, same columns)
-- ---------------------------------------------------------------------------

alter table public.leads_import rename to leads_import_backup;

create view public.leads_import as
select
  company_name as "Empresa",
  icp as "ICP",
  contact_name as "Nome",
  job_title as "Cargo",
  email as "E-mail",
  source as "Fonte",
  funnel_stage as "Funil",
  linkedin_url as "LinkedIn",
  location as "Local",
  notes as "Notas",
  lead_score::text as "Pontuação do lead",
  website as "Site",
  array_to_string(tags, ', ') as "Tags",
  phone as "Telefone",
  last_contacted_at::text as "Último contato",
  preferred_channel as "Canal",
  identity_key,
  id
from public.leads;

create or replace function public.leads_import_view_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_id uuid;
begin
  v_key := coalesce(
    nullif(new.identity_key, ''),
    public.compute_identity_key(new."E-mail", new."Telefone", new."LinkedIn", new."Empresa", new."Nome")
  );

  select id into v_id from public.leads where identity_key = v_key;

  if v_id is not null then
    -- Dedup: enrich the existing lead; non-empty incoming fields win.
    update public.leads set
      company_name = coalesce(nullif(new."Empresa", ''), company_name),
      contact_name = coalesce(nullif(new."Nome", ''), contact_name),
      job_title = coalesce(nullif(new."Cargo", ''), job_title),
      email = coalesce(nullif(new."E-mail", ''), email),
      phone = coalesce(nullif(new."Telefone", ''), phone),
      website = coalesce(nullif(new."Site", ''), website),
      linkedin_url = coalesce(nullif(new."LinkedIn", ''), linkedin_url),
      source = coalesce(nullif(new."Fonte", ''), source),
      funnel_stage = case
        when new."Funil" in ('Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
        then new."Funil"
        else funnel_stage
      end,
      icp = coalesce(nullif(new."ICP", ''), icp),
      location = coalesce(nullif(new."Local", ''), location),
      notes = coalesce(nullif(new."Notas", ''), notes),
      lead_score = coalesce(public.parse_lead_score(new."Pontuação do lead"), lead_score),
      tags = case when coalesce(new."Tags", '') <> '' then public.parse_tags(new."Tags") else tags end,
      last_contacted_at = coalesce(public.parse_notion_date(new."Último contato"), last_contacted_at),
      preferred_channel = case
        when new."Canal" in ('Email', 'Telefone') then new."Canal"
        else preferred_channel
      end
    where id = v_id;
  else
    v_id := coalesce(new.id, gen_random_uuid());
    insert into public.leads (
      id, identity_key, company_name, contact_name, job_title, email, phone,
      website, linkedin_url, source, funnel_stage, icp, location, notes,
      lead_score, tags, last_contacted_at, preferred_channel
    )
    values (
      v_id,
      v_key,
      coalesce(nullif(new."Empresa", ''), 'Sem empresa'),
      coalesce(nullif(new."Nome", ''), 'Sem contacto'),
      nullif(new."Cargo", ''),
      nullif(new."E-mail", ''),
      nullif(new."Telefone", ''),
      nullif(new."Site", ''),
      nullif(new."LinkedIn", ''),
      nullif(new."Fonte", ''),
      case
        when new."Funil" in ('Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
        then new."Funil"
        else 'Lead'
      end,
      coalesce(nullif(new."ICP", ''), 'Por classificar'),
      coalesce(nullif(new."Local", ''), 'Desconhecido'),
      nullif(new."Notas", ''),
      public.parse_lead_score(new."Pontuação do lead"),
      public.parse_tags(new."Tags"),
      public.parse_notion_date(new."Último contato"),
      case when new."Canal" in ('Email', 'Telefone') then new."Canal" end
    );
  end if;

  new.id := v_id;
  new.identity_key := v_key;
  return new;
end;
$$;

create trigger leads_import_view_insert
instead of insert on public.leads_import
for each row execute function public.leads_import_view_insert();

create or replace function public.leads_import_view_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.leads set
    company_name = coalesce(nullif(new."Empresa", ''), company_name),
    contact_name = coalesce(nullif(new."Nome", ''), contact_name),
    job_title = nullif(new."Cargo", ''),
    email = nullif(new."E-mail", ''),
    phone = nullif(new."Telefone", ''),
    website = nullif(new."Site", ''),
    linkedin_url = nullif(new."LinkedIn", ''),
    source = nullif(new."Fonte", ''),
    funnel_stage = case
      when new."Funil" in ('Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
      then new."Funil"
      else funnel_stage
    end,
    icp = coalesce(nullif(new."ICP", ''), icp),
    location = coalesce(nullif(new."Local", ''), location),
    notes = nullif(new."Notas", ''),
    lead_score = public.parse_lead_score(new."Pontuação do lead"),
    tags = public.parse_tags(new."Tags"),
    last_contacted_at = public.parse_notion_date(new."Último contato"),
    preferred_channel = case when new."Canal" in ('Email', 'Telefone') then new."Canal" end
  where id = old.id;
  return new;
end;
$$;

create trigger leads_import_view_update
instead of update on public.leads_import
for each row execute function public.leads_import_view_update();

create or replace function public.leads_import_view_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.leads where id = old.id;
  return old;
end;
$$;

create trigger leads_import_view_delete
instead of delete on public.leads_import
for each row execute function public.leads_import_view_delete();

-- Match the access the physical table had (no RLS, anon read/write via
-- PostgREST for the n8n workflows).
grant select, insert, update, delete on public.leads to anon, authenticated, service_role;
grant select, insert, update, delete on public.lead_activities to anon, authenticated, service_role;
grant select, insert, update, delete on public.leads_import to anon, authenticated, service_role;

commit;
