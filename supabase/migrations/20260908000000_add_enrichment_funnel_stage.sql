-- Adds the "Enrichment" funnel stage, which sits before "Lead": leads that still
-- need data (missing email being the main case) before they are workable pipeline.
--
-- public.leads.funnel_stage is plain text with no CHECK constraint on this database,
-- so the only gate on the value is the leads_import view's INSTEAD OF triggers, which
-- silently fall back to the previous stage on an unrecognised value. Both are rebuilt
-- below from the deployed definitions with 'Enrichment' added to each stage list.

create or replace function public.leads_import_view_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      phone = coalesce(nullif(new."Telefone", ''), phone),
      website = coalesce(nullif(new."Site", ''), website),
      linkedin_url = coalesce(nullif(new."LinkedIn", ''), linkedin_url),
      source = coalesce(nullif(new."Fonte", ''), source),
      funnel_stage = case
        when new."Funil" in ('Enrichment','Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
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
        when new."Funil" in ('Enrichment','Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
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
$function$;

create or replace function public.leads_import_view_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      when new."Funil" in ('Enrichment','Lead','Contacted','Engaged','Negotiation','Closed - Won','Closed - On Hold','Closed - Lost')
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
$function$;

-- Backfill: every lead sitting in "Lead" without a usable email belongs in Enrichment.
-- The log_lead_stage_change trigger records one stage_change activity per row.
update public.leads
set funnel_stage = 'Enrichment'
where funnel_stage = 'Lead'
  and (email is null or btrim(email) = '');
