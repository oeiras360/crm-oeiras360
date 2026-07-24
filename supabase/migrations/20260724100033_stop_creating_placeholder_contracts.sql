-- Winning a lead creates the account view automatically because accounts are
-- derived from leads. A blank client_deals row is therefore unnecessary and
-- makes the UI look like there is one special contract to edit.
drop trigger if exists promote_won_lead_to_client on public.leads;
drop trigger if exists promote_won_lead_to_client on public.leads_import;
drop function if exists public.promote_won_lead_to_client();

-- Remove only untouched legacy placeholders. Configured contracts and every
-- contract with a payment event are preserved.
delete from public.client_deals as deal
where deal.contract_start is null
  and deal.contract_end is null
  and deal.amount_cents is null
  and deal.billing_cadence is null
  and deal.next_payment_at is null
  and not exists (
    select 1
    from public.payment_events as payment
    where payment.client_deal_id = deal.id
  );
