-- Controle de Locação: banco do servidor (Supabase).
-- Cada locadora é uma "loja". Usuários entram numa loja como dono ou funcionário.
-- Os dados do app ficam em "registros" (um por item, cliente, locação, lançamento),
-- e cada aparelho sincroniza pelo campo atualizado_em.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- lojas
create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null default '',
  -- código que o dono passa para o funcionário entrar na loja
  codigo_convite text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  -- plano: só o servidor altera (pagamento da assinatura ou teste grátis)
  pro_ate date,
  teste_ate date,
  criado_em timestamptz not null default now()
);

create table public.membros (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'funcionario')),
  criado_em timestamptz not null default now(),
  primary key (loja_id, usuario_id)
);
create index membros_usuario on public.membros (usuario_id);

-- ---------------------------------------------------------------- dados do app
create table public.registros (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  tipo text not null check (tipo in ('item', 'cliente', 'locacao', 'lancamento', 'loja')),
  id text not null,
  dados jsonb not null,
  excluido boolean not null default false,
  atualizado_em timestamptz not null default clock_timestamp(),
  atualizado_por uuid default auth.uid(),
  primary key (loja_id, tipo, id)
);
create index registros_sincronizacao on public.registros (loja_id, atualizado_em);

-- Toda gravação atualiza a hora, para os outros aparelhos saberem o que mudou.
create function public.marcar_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := clock_timestamp();
  return new;
end $$;

create trigger registros_atualizado before insert or update on public.registros
for each row execute function public.marcar_atualizacao();

-- ---------------------------------------------------------------- segredos (só o servidor lê)
create table public.segredos_loja (
  loja_id uuid primary key references public.lojas (id) on delete cascade,
  asaas_chave text,
  asaas_sandbox boolean not null default true,
  asaas_conta text,
  asaas_webhook_token text,
  atualizado_em timestamptz not null default now()
);

-- Ligações entre os serviços externos e os dados do app
create table public.contratos_externos (
  id_externo text primary key, -- documento no serviço de assinatura
  loja_id uuid not null references public.lojas (id) on delete cascade,
  locacao_id text not null,
  criado_em timestamptz not null default now()
);

create table public.cobrancas_externas (
  id_externo text primary key, -- cobrança no Asaas
  loja_id uuid not null references public.lojas (id) on delete cascade,
  locacao_id text not null,
  cobranca_id text not null,
  criado_em timestamptz not null default now()
);

-- Trava para gerar um boleto só por contrato assinado, mesmo com avisos repetidos.
create table public.boleto_do_contrato (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  locacao_id text not null,
  cobranca_id text,
  link text,
  criado_em timestamptz not null default now(),
  primary key (loja_id, locacao_id)
);

-- Avisos (webhooks) já processados, para não processar o mesmo duas vezes.
create table public.eventos_processados (
  id text primary key,
  origem text not null,
  recebido_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- funções de acesso
create function public.eh_membro(loja uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where loja_id = loja and usuario_id = auth.uid());
$$;

create function public.eh_dono(loja uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where loja_id = loja and usuario_id = auth.uid() and papel = 'dono');
$$;

create function public.loja_pro(loja uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lojas where id = loja
      and (coalesce(pro_ate, '1900-01-01') >= current_date or coalesce(teste_ate, '1900-01-01') >= current_date)
  );
$$;

-- Cria a loja do usuário que acabou de se cadastrar e o coloca como dono.
create function public.criar_loja(nome_loja text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  nova uuid;
begin
  if auth.uid() is null then raise exception 'faça login primeiro'; end if;
  insert into lojas (nome) values (coalesce(nullif(trim(nome_loja), ''), 'Minha locadora')) returning id into nova;
  insert into membros (loja_id, usuario_id, papel) values (nova, auth.uid(), 'dono');
  return nova;
end $$;

-- Funcionário entra na loja com o código de convite.
create function public.entrar_com_convite(codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  alvo uuid;
begin
  if auth.uid() is null then raise exception 'faça login primeiro'; end if;
  select id into alvo from lojas where codigo_convite = upper(trim(codigo));
  if alvo is null then raise exception 'código de convite não encontrado'; end if;
  insert into membros (loja_id, usuario_id, papel) values (alvo, auth.uid(), 'funcionario')
  on conflict (loja_id, usuario_id) do nothing;
  return alvo;
end $$;

-- Teste grátis do Pro: uma vez por loja, 7 dias.
create function public.iniciar_teste(loja uuid) returns date
language plpgsql security definer set search_path = public as $$
declare
  fim date;
begin
  if not eh_dono(loja) then raise exception 'só o dono pode iniciar o teste'; end if;
  update lojas set teste_ate = current_date + 7 where id = loja and teste_ate is null returning teste_ate into fim;
  if fim is null then select teste_ate into fim from lojas where id = loja; end if;
  return fim;
end $$;

-- ---------------------------------------------------------------- regras de acesso (RLS)
alter table public.lojas enable row level security;
alter table public.membros enable row level security;
alter table public.registros enable row level security;
alter table public.segredos_loja enable row level security;
alter table public.contratos_externos enable row level security;
alter table public.cobrancas_externas enable row level security;
alter table public.boleto_do_contrato enable row level security;
alter table public.eventos_processados enable row level security;
-- As cinco últimas não têm regra nenhuma: só o servidor (service role) acessa.

create policy "membro vê a loja" on public.lojas for select using (eh_membro(id));
create policy "dono renomeia a loja" on public.lojas for update using (eh_dono(id)) with check (eh_dono(id));
-- impede o app de mexer no plano: só nome pode mudar por update do cliente
revoke update on public.lojas from authenticated;
grant update (nome) on public.lojas to authenticated;

create policy "vê membros da própria loja" on public.membros for select using (eh_membro(loja_id));
create policy "dono remove funcionário" on public.membros for delete using (eh_dono(loja_id) and papel = 'funcionario');

create policy "membro lê registros" on public.registros for select using (eh_membro(loja_id));
create policy "membro cria registros" on public.registros for insert with check (eh_membro(loja_id));
create policy "membro altera registros" on public.registros for update using (eh_membro(loja_id)) with check (eh_membro(loja_id));

-- ---------------------------------------------------------------- fotos (Storage)
-- Bucket privado; cada loja só acessa a pasta com o próprio id.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;

create policy "membro lê fotos da loja" on storage.objects for select
  using (bucket_id = 'fotos' and public.eh_membro(((storage.foldername(name))[1])::uuid));
create policy "membro envia fotos da loja" on storage.objects for insert
  with check (bucket_id = 'fotos' and public.eh_membro(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------- tempo real
alter publication supabase_realtime add table public.registros;
