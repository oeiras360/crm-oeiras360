-- A won client can have multiple independent commercial contracts.
alter table public.client_deals
  drop constraint if exists client_deals_lead_id_key;

create index if not exists client_deals_lead_id_idx
  on public.client_deals (lead_id);

alter table public.client_deals
  drop constraint if exists client_deals_billing_cadence_check;

alter table public.client_deals
  add constraint client_deals_billing_cadence_check
  check (
    billing_cadence is null
    or billing_cadence in (
      'one_time',
      'monthly',
      'bimonthly',
      'quarterly',
      'annually'
    )
  );

-- Promotion creates only the initial placeholder contract. Additional contracts
-- are created explicitly from the client screen.
create or replace function public.promote_won_lead_to_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new."Funil" = 'Closed - Won'
    and not exists (
      select 1
      from public.client_deals
      where lead_id = new.id
    )
  then
    insert into public.client_deals (lead_id, deal_name, status)
    values (new.id, new."Empresa", 'active');
  end if;

  return new;
end;
$$;
