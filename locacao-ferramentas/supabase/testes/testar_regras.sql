-- Testes das regras de acesso. Cada bloco falha (raise) se a regra não se comportar como esperado.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
create temp table t_loja as select public.criar_loja('Locadora do Zé') as id;
grant select on t_loja to authenticated;
insert into public.registros (loja_id, tipo, id, dados) select id, 'item', 'i1', '{"nome":"Betoneira"}' from t_loja;
insert into public.registros (loja_id, tipo, id, dados) select id, 'cliente', 'c1', '{"nome":"João"}' from t_loja;

do $$ begin
  if (select count(*) from public.registros) <> 2 then raise exception 'dono deveria ver 2 registros'; end if;
  if not public.loja_pro((select id from t_loja)) is false then raise exception 'loja nova não deveria ser Pro'; end if;
end $$;

-- dono não pode se dar o plano Pro
do $$ begin
  begin
    update public.lojas set pro_ate = '2099-01-01';
    raise exception 'FALHA: app conseguiu mudar pro_ate';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.lojas set nome = 'Locadora do Zé Ltda';

-- teste grátis: 7 dias, uma vez só
do $$ declare d date; begin
  d := public.iniciar_teste((select id from t_loja));
  if d <> current_date + 7 then raise exception 'teste deveria ir até hoje + 7'; end if;
  if not public.loja_pro((select id from t_loja)) then raise exception 'em teste deveria ser Pro'; end if;
end $$;

-- segredos não são legíveis pelo app
do $$ begin
  if (select count(*) from public.segredos_loja) <> 0 then raise exception 'app leu segredos'; end if;
  begin
    insert into public.segredos_loja (loja_id, asaas_chave) select id, 'x' from t_loja;
    raise exception 'FALHA: app gravou segredo';
  exception when insufficient_privilege then null;
  end;
end $$;

-- outro usuário não vê nada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if (select count(*) from public.registros) <> 0 then raise exception 'estranho viu registros'; end if;
  if (select count(*) from public.lojas) <> 0 then raise exception 'estranho viu a loja'; end if;
  begin
    insert into public.registros (loja_id, tipo, id, dados) select id, 'item', 'x', '{}' from t_loja;
    raise exception 'FALHA: estranho gravou registro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- entra com o convite e passa a ver, como funcionário
reset role;
create temp table t_codigo as select codigo_convite from public.lojas;
grant select on t_codigo to authenticated;
set role authenticated;
select public.entrar_com_convite((select lower(codigo_convite) from t_codigo));
do $$ begin
  if (select count(*) from public.registros) <> 2 then raise exception 'funcionário deveria ver 2 registros'; end if;
  if public.eh_dono((select id from t_loja)) then raise exception 'funcionário não é dono'; end if;
  begin
    perform public.iniciar_teste((select id from t_loja));
    raise exception 'FALHA: funcionário iniciou teste';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- sincronização: atualizar muda atualizado_em
do $$ declare antes timestamptz; depois timestamptz; begin
  select atualizado_em into antes from public.registros where id = 'i1';
  perform pg_sleep(0.01);
  update public.registros set dados = '{"nome":"Betoneira 150 L"}' where id = 'i1';
  select atualizado_em into depois from public.registros where id = 'i1';
  if depois <= antes then raise exception 'atualizado_em não avançou'; end if;
end $$;

-- fotos: só na pasta da própria loja
do $$ begin
  insert into storage.objects (bucket_id, name) select 'fotos', id || '/foto1.jpg' from t_loja;
  begin
    insert into storage.objects (bucket_id, name) values ('fotos', '11111111-1111-1111-1111-111111111111/x.jpg');
    raise exception 'FALHA: enviou foto para pasta de outra loja';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'TODOS OS TESTES DE REGRAS PASSARAM' as resultado;
