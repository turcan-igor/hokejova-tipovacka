create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store these values in Supabase Vault first:
-- select vault.create_secret('https://PROJECT_REF.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SYNC_SECRET', 'sync_secret');

select cron.schedule(
  'sync-iihf-results',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-iihf-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
