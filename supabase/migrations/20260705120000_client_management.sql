-- Won-client commercial terms and billing schedule.
create table if not exists public.client_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique,
  -- The row is created as soon as a lead is won. Commercial terms are then
  -- completed from the client detail screen.
  deal_name text,
  service text,
  contract_start date,
  contract_end date,
  amount_cents integer check (amount_cents >= 0),
  currency text not null default 'EUR',
  billing_cadence text
    check (
      billing_cadence is null
      or billing_cadence in ('one_time', 'monthly', 'quarterly', 'annually')
    ),
  next_payment_at date,
  status text not null default 'active'
    check (status in ('active', 'ending_soon', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_deals_dates_check check (
    contract_start is null
    or contract_end is null
    or contract_end >= contract_start
  )
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  client_deal_id uuid not null references public.client_deals(id) on delete cascade,
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'paid', 'overdue')),
  label text not null default 'Service payment',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_deals_status_idx on public.client_deals (status);
create index if not exists payment_events_due_date_idx on public.payment_events (due_date);
create index if not exists payment_events_client_idx on public.payment_events (client_deal_id);

-- Promote a lead to the client area exactly once when it becomes Closed - Won.
-- Keep the row if the pipeline stage changes later so commercial history is not lost.
create or replace function public.promote_won_lead_to_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new."Funil" = 'Closed - Won' then
    insert into public.client_deals (lead_id, deal_name, status)
    values (new.id, new."Empresa", 'active')
    on conflict (lead_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists promote_won_lead_to_client on public.leads_import;
create trigger promote_won_lead_to_client
after insert or update of "Funil" on public.leads_import
for each row
when (new."Funil" = 'Closed - Won')
execute function public.promote_won_lead_to_client();

-- Backfill leads that were already won before this migration was applied.
insert into public.client_deals (lead_id, deal_name, status)
select id, "Empresa", 'active'
from public.leads_import
where "Funil" = 'Closed - Won'
on conflict (lead_id) do nothing;

alter table public.client_deals enable row level security;
alter table public.payment_events enable row level security;
