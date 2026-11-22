# Controle de Locação

App para locadoras (ferramentas, equipamentos, andaimes) controlarem o negócio pelo celular, vendido por assinatura.
Feito com Expo (React Native) e Expo Router, com servidor no Supabase.

## O que o app faz

- **Início:** locações abertas, atrasadas, recebido no mês e a receber; quem está atrasado e quem devolve hoje.
- **Locações:** registrar (cliente, itens, datas, desconto, frete, caução, pagamento na hora), receber pagamentos,
  **estender o prazo** (confere o estoque), devolução com **fotos, avaria e desconto da caução**, multa automática por atraso, histórico.
- **Contrato com fotos:** PDF com os dados da locadora e do cliente, **foto, quantidade, diária, dias e valor de cada item**,
  cláusulas (inclui atraso, avaria, inadimplência e assinatura eletrônica) e as fotos da vistoria.
- **Assinatura pelo WhatsApp:** o app gera o contrato, cria o documento no **ZapSign** e abre a conversa do cliente no WhatsApp
  com o link para assinar.
- **Boleto automático:** quando o cliente assina, o servidor gera o **boleto no Asaas** com o vencimento escolhido e o cliente
  é levado direto para ele (o Asaas também envia por e-mail/SMS). O pagamento dá baixa sozinho.
- **Serasa:** boleto vencido pode ser negativado pelo Asaas com um toque, ou automaticamente depois de X dias (configurável).
- **Estoque:** foto do produto, diária, caução, quantidade e **calendário de disponibilidade** por dia.
- **Clientes:** cadastro completo (CPF/CNPJ validado, endereço), fotos dos documentos, histórico e quanto deve.
- **Financeiro:** entradas e saídas do mês, resultado, entradas por forma de pagamento, despesas por categoria,
  contas a pagar e a receber.
- **Lembretes:** aviso no celular às 8h do dia da devolução e no dia seguinte, se não voltou.
- **Nuvem:** login, dados em vários celulares em tempo real, funcionários entram com código de convite, fotos no Storage.

### Modo demonstração

Sem servidor configurado, tudo funciona no aparelho e a parte de assinatura, boleto e Serasa é **simulada**
(botões "Simular assinatura", "Simular pagamento", "Simular vencimento"). Serve para testar e para apresentar a clientes.
O app avisa na tela quando está simulando.

## Planos (em `src/constants/plano.ts`)

| | Grátis | Pro |
|---|---|---|
| Itens / clientes / locações por mês | 10 / 25 / 15 | sem limite |
| Contrato com assinatura eletrônica, boleto automático, Serasa | não | sim |
| Nuvem, vários celulares e funcionários | sim | sim |
| Relatórios | não | sim |
| Preço | R$ 0 | R$ 39,90/mês ou R$ 399/ano |

Com servidor ligado, o plano fica no banco (`lojas.pro_ate` e `lojas.teste_ate`) e o app não consegue alterá-lo.
Para liberar o Pro de um cliente que pagou, atualize `pro_ate` no Supabase. **A cobrança da sua assinatura ainda não é automática.**

## Ligar o servidor de verdade (passo a passo)

Você vai precisar de três contas: **Supabase** (servidor e banco), **ZapSign** (assinatura eletrônica, paga por você e
incluída no preço do Pro) e o **Asaas** de cada locadora cliente (o dinheiro dos boletos cai na conta da locadora).

1. **Supabase:** crie um projeto em supabase.com. Em *Project Settings › API*, copie a URL e a chave `anon`.
   Crie o arquivo `.env` a partir de `.env.example` com esses dois valores.
2. **Banco:** instale a CLI (`npm i -g supabase`), rode `supabase login`, `supabase link --project-ref SEU-PROJETO`
   e `supabase db push` (aplica `supabase/migrations`).
3. **ZapSign:** crie a conta em zapsign.com.br (há ambiente de testes). Em *Configurações › Integração*, copie o token da API.
4. **Segredos das funções:**
   ```bash
   supabase secrets set ZAPSIGN_TOKEN=... ZAPSIGN_SANDBOX=true \
     ZAPSIGN_WEBHOOK_SEGREDO=um-texto-longo-aleatorio ROTINA_SEGREDO=outro-texto-longo-aleatorio
   ```
5. **Funções:** `supabase functions deploy` (publica as 9 funções de `supabase/functions`).
6. **Aviso de assinatura:** no ZapSign, cadastre o webhook
   `https://SEU-PROJETO.supabase.co/functions/v1/zapsign-webhook?segredo=O-MESMO-ZAPSIGN_WEBHOOK_SEGREDO`.
7. **Negativação automática:** rode o conteúdo de `supabase/agendar_rotina.sql` no SQL Editor (troque os dois valores).
8. **No app:** crie a conta, crie a locadora e, em *Configurações › Asaas, assinatura e Serasa*, cole a chave de API do Asaas
   (comece pelo sandbox). O servidor confere a chave e cadastra sozinho o aviso de pagamentos no Asaas.
9. Quando tudo funcionar no sandbox, troque `ZAPSIGN_SANDBOX=false` e cole a chave de produção do Asaas.

### Antes de vender

- **Contrato:** o modelo em `src/lib/contrato.ts` foi escrito com cláusulas comuns de locação, mas **peça a um advogado para revisar**.
- **Serasa:** o Asaas notifica o devedor antes da inclusão, como exige o CDC, e cobra tarifa por negativação. Confira os valores
  e as regras na conta Asaas de cada locadora.
- **LGPD:** o app guarda CPF, endereço e fotos de documentos. Tenha uma política de privacidade e só peça o necessário.
- **Conferir no sandbox:** a criação do documento no ZapSign (inclusive o `redirect_link`), o webhook do Asaas e a negativação
  (`/paymentDunnings`) foram programados pela documentação dessas APIs, mas ainda não rodaram contra os serviços reais.

## Rodar

```bash
npm install
npx expo start         # QR code para abrir no app Expo Go
npx expo start --web   # versão para navegador
```

## Onde mexer

| O quê | Arquivo |
|---|---|
| Limites e preços dos planos | `src/constants/plano.ts` |
| Regras de cálculo (total, multa, saldo, disponibilidade) | `src/lib/calculos.ts` |
| Financeiro | `src/lib/financeiro.ts` |
| Modelo do contrato e do recibo | `src/lib/contrato.ts` |
| Estado e ações (alugar, pagar, devolver, estender) | `src/store/dados.tsx` |
| Sincronização com a nuvem | `src/store/nuvem.tsx` |
| Chamadas ao servidor (e simulação) | `src/lib/servidor.ts` |
| Banco, regras de acesso e mescla | `supabase/migrations/` |
| Funções do servidor (ZapSign, Asaas, Serasa) | `supabase/functions/` |

## Testes

```bash
npx tsc --noEmit && npx expo lint                       # app
cd supabase/functions && deno check */index.ts && deno test _shared/   # servidor
```

`supabase/testes/` tem os testes do banco (regras de acesso e mescla), que rodam num Postgres comum:
primeiro `simular_supabase.sql`, depois as migrations, depois `testar_regras.sql` e `testar_mescla.sql`.
