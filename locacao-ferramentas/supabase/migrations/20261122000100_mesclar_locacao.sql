-- O app (celular) e o servidor (avisos do ZapSign e do Asaas) gravam a mesma locação.
-- Para que uma gravação nunca apague a outra, contrato, boletos, pagamentos e histórico
-- são mesclados: o que já avançou não volta atrás (ex.: boleto pago continua pago).

create function public.posicao_contrato(etapa text) returns int
language sql immutable as $$
  select case etapa when 'rascunho' then 0 when 'enviado' then 1 when 'recusado' then 2 when 'assinado' then 3 else -1 end
$$;

create function public.posicao_cobranca(etapa text) returns int
language sql immutable as $$
  select case etapa when 'aguardando' then 0 when 'vencida' then 1 when 'negativada' then 2 when 'cancelada' then 3 when 'paga' then 4 else -1 end
$$;

create function public.mesclar_locacao(antigo jsonb, novo jsonb) returns jsonb
language plpgsql immutable as $$
declare
  resultado jsonb := novo;
  contrato jsonb;
  cobrancas jsonb;
  pagamentos jsonb;
  historico jsonb;
begin
  -- contrato: fica o mais avançado; os campos do mais novo completam o outro
  if antigo ? 'contrato' and jsonb_typeof(antigo -> 'contrato') = 'object' then
    if not (novo ? 'contrato') or jsonb_typeof(novo -> 'contrato') <> 'object' then
      contrato := antigo -> 'contrato';
    elsif posicao_contrato(antigo #>> '{contrato,etapa}') > posicao_contrato(novo #>> '{contrato,etapa}') then
      contrato := (novo -> 'contrato') || (antigo -> 'contrato');
    else
      contrato := (antigo -> 'contrato') || (novo -> 'contrato');
    end if;
    resultado := jsonb_set(resultado, '{contrato}', contrato);
  end if;

  -- boletos: junta pelos ids; em cada um fica a etapa mais avançada
  select coalesce(jsonb_agg(c order by c ->> 'criadaEm'), '[]'::jsonb) into cobrancas
  from (
    select distinct on (x ->> 'id')
      case when y is null then x
           when posicao_cobranca(y ->> 'etapa') > posicao_cobranca(x ->> 'etapa') then x || y
           else y || x end as c
    from jsonb_array_elements(coalesce(antigo -> 'cobrancas', '[]') || coalesce(novo -> 'cobrancas', '[]')) x
    left join lateral (
      select z from jsonb_array_elements(coalesce(antigo -> 'cobrancas', '[]') || coalesce(novo -> 'cobrancas', '[]')) z
      where z ->> 'id' = x ->> 'id' and z <> x limit 1
    ) w(y) on true
    order by x ->> 'id', posicao_cobranca(x ->> 'etapa') desc
  ) t;
  resultado := jsonb_set(resultado, '{cobrancas}', cobrancas);

  -- pagamentos: junta pelos ids, e um boleto só gera um pagamento
  select coalesce(jsonb_agg(p order by p ->> 'data', p ->> 'id'), '[]'::jsonb) into pagamentos
  from (
    select distinct on (coalesce(p ->> 'cobrancaId', p ->> 'id')) p
    from jsonb_array_elements(coalesce(antigo -> 'pagamentos', '[]') || coalesce(novo -> 'pagamentos', '[]')) p
    order by coalesce(p ->> 'cobrancaId', p ->> 'id'), p ->> 'id'
  ) t;
  resultado := jsonb_set(resultado, '{pagamentos}', pagamentos);

  -- histórico: junta tudo, sem repetir, em ordem de data
  select coalesce(jsonb_agg(h order by h ->> 'data'), '[]'::jsonb) into historico
  from (
    select distinct h from jsonb_array_elements(coalesce(antigo -> 'historico', '[]') || coalesce(novo -> 'historico', '[]')) h
  ) t;
  resultado := jsonb_set(resultado, '{historico}', historico);

  return resultado;
end $$;

create function public.mesclar_registro() returns trigger
language plpgsql as $$
begin
  if new.tipo = 'locacao' and not new.excluido then
    new.dados := public.mesclar_locacao(old.dados, new.dados);
  end if;
  return new;
end $$;

create trigger registros_mesclar before update on public.registros
for each row execute function public.mesclar_registro();
