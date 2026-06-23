-- Replace PROJECT_REF and CRON_SECRET before running this in Supabase SQL.
-- Schedule this once after deploying the send-payment-reminders Edge Function.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-payment-reminders-daily')
where exists (
  select 1
  from cron.job
  where jobname = 'send-payment-reminders-daily'
);

select cron.schedule(
  'send-payment-reminders-daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://poweuugpspykoswgyvxn.functions.supabase.co/send-payment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer dJlnxqAByKG9crjTCbtRyDXjz4fq5Sr41NH3D2LkRx7HOvTqKljUcPfw/xWBZ+Wr',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $$
);
