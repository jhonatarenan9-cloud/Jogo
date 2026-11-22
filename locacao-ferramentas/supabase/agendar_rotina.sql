-- Rode UMA vez no SQL Editor do Supabase, depois de publicar as funções.
-- Troque SEU-PROJETO e SEGREDO-DA-ROTINA (o mesmo valor do segredo ROTINA_SEGREDO das funções).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'negativacao-automatica',
  '17 12 * * *', -- todo dia às 9h17 (horário de Brasília)
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/rotina-diaria',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rotina-segredo', 'SEGREDO-DA-ROTINA'),
    body := '{}'::jsonb
  );
  $$
);
