\set ON_ERROR_STOP on
-- Servidor marca contrato assinado e boleto pago; depois o celular grava uma versão velha.
insert into public.registros (loja_id, tipo, id, dados) select id, 'locacao', 'L1', '{
  "numero": 1, "situacao": "aberta",
  "contrato": {"etapa": "enviado", "vencimento": "2026-11-30", "linkAssinatura": "https://x"},
  "cobrancas": [], "pagamentos": [{"id": "p1", "valor": 50, "forma": "Pix", "data": "2026-11-20"}],
  "historico": [{"data": "2026-11-20T10:00:00Z", "texto": "Locação registrada"}]
}'::jsonb from public.lojas limit 1;

-- servidor
update public.registros set dados = dados
  || '{"contrato": {"etapa": "assinado", "vencimento": "2026-11-30", "linkAssinatura": "https://x", "assinadoEm": "2026-11-21T09:00:00Z"}}'
  || jsonb_build_object('cobrancas', '[{"id": "c1", "etapa": "paga", "valor": 100, "criadaEm": "2026-11-21T09:00:01Z"}]'::jsonb,
                        'pagamentos', (dados -> 'pagamentos') || '[{"id": "p2", "valor": 100, "forma": "Boleto", "data": "2026-11-22", "cobrancaId": "c1"}]'::jsonb,
                        'historico', (dados -> 'historico') || '[{"data": "2026-11-21T09:00:00Z", "texto": "Contrato assinado"}]'::jsonb)
where id = 'L1';

-- celular grava a versão antiga com uma foto nova e um pagamento novo em dinheiro
update public.registros set dados = '{
  "numero": 1, "situacao": "aberta", "fotosRetirada": ["foto1"],
  "contrato": {"etapa": "enviado", "vencimento": "2026-11-30", "linkAssinatura": "https://x"},
  "cobrancas": [{"id": "c1", "etapa": "aguardando", "valor": 100, "criadaEm": "2026-11-21T09:00:01Z"}],
  "pagamentos": [{"id": "p1", "valor": 50, "forma": "Pix", "data": "2026-11-20"}, {"id": "p3", "valor": 10, "forma": "Dinheiro", "data": "2026-11-22"}],
  "historico": [{"data": "2026-11-20T10:00:00Z", "texto": "Locação registrada"}, {"data": "2026-11-22T08:00:00Z", "texto": "Pagamento de R$ 10,00 (Dinheiro)"}]
}' where id = 'L1';

do $$ declare d jsonb; begin
  select dados into d from public.registros where id = 'L1';
  if d #>> '{contrato,etapa}' <> 'assinado' then raise exception 'contrato voltou atrás: %', d -> 'contrato'; end if;
  if d #>> '{contrato,assinadoEm}' is null then raise exception 'perdeu a data da assinatura'; end if;
  if d #>> '{cobrancas,0,etapa}' <> 'paga' then raise exception 'boleto voltou atrás: %', d -> 'cobrancas'; end if;
  if jsonb_array_length(d -> 'pagamentos') <> 3 then raise exception 'pagamentos errados: %', d -> 'pagamentos'; end if;
  if jsonb_array_length(d -> 'historico') <> 3 then raise exception 'histórico errado: %', d -> 'historico'; end if;
  if d #>> '{fotosRetirada,0}' <> 'foto1' then raise exception 'perdeu a foto do celular'; end if;
end $$;

-- o mesmo boleto pago chegando duas vezes não duplica o pagamento
update public.registros set dados = jsonb_set(dados, '{pagamentos}', (dados -> 'pagamentos') || '[{"id": "p9", "valor": 100, "forma": "Boleto", "data": "2026-11-22", "cobrancaId": "c1"}]') where id = 'L1';
do $$ begin
  if (select jsonb_array_length(dados -> 'pagamentos') from public.registros where id = 'L1') <> 3 then
    raise exception 'pagamento do boleto duplicou';
  end if;
end $$;

select 'TESTES DE MESCLA PASSARAM' as resultado;
