-- 0005_payment_hardening.sql
-- Backstop for the app-level dedup in /api/payments/claim: at most ONE pending
-- manual payment per user at a time, so retries / double-clicks can't stack the
-- admin review queue. The claim route also checks this in app code; this index
-- makes it race-proof.
--
-- PREREQUISITE: if duplicate pending rows already exist this will fail — clean
-- them up first, keeping the latest per user, e.g.:
--   delete from public.payments p using public.payments q
--   where p.status = 'pending' and q.status = 'pending'
--     and p.user_id = q.user_id and p.created_at < q.created_at;

create unique index if not exists payments_one_pending
  on public.payments (user_id)
  where status = 'pending';
