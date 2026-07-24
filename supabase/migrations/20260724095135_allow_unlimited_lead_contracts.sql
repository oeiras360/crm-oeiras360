-- A lead/account can own any number of independent contracts. Keep this
-- idempotent because older environments may already have the original
-- multiple-contracts migration applied.
alter table public.client_deals
  drop constraint if exists client_deals_lead_id_key;

create index if not exists client_deals_lead_id_idx
  on public.client_deals (lead_id);
