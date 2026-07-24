begin;

alter table public.leads
  add column if not exists second_email boolean not null default false;

create or replace view public.leads_import as
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
  id,
  second_email as "2nd Email"
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
    update public.leads set
      company_name = coalesce(nullif(new."Empresa", ''), company_name),
      contact_name = coalesce(nullif(new."Nome", ''), contact_name),
      job_title = coalesce(nullif(new."Cargo", ''), job_title),
      email = coalesce(nullif(new."E-mail", ''), email),
      second_email = coalesce(new."2nd Email", second_email),
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
      id, identity_key, company_name, contact_name, job_title, email,
      second_email, phone, website, linkedin_url, source, funnel_stage, icp,
      location, notes, lead_score, tags, last_contacted_at, preferred_channel
    )
    values (
      v_id,
      v_key,
      coalesce(nullif(new."Empresa", ''), 'Sem empresa'),
      coalesce(nullif(new."Nome", ''), 'Sem contacto'),
      nullif(new."Cargo", ''),
      nullif(new."E-mail", ''),
      coalesce(new."2nd Email", false),
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
    second_email = coalesce(new."2nd Email", false),
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

commit;
