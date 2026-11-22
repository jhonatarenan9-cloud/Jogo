# Controle de Locação

App para donos de locadoras (ferramentas, equipamentos, andaimes etc.) controlarem o negócio pelo celular.
Feito com Expo (React Native) e Expo Router. O modelo de negócio é por assinatura: plano Grátis com limites e plano Pro.

## O que o app faz

- **Início:** locações abertas, atrasadas, recebido no mês e quanto falta receber. Lista quem está atrasado e quem devolve hoje.
- **Locações:** registrar locação (cliente, itens e quantidades, data de retirada, dias, desconto, frete, caução e pagamento na hora),
  registrar pagamentos, devolução com multa automática por atraso (uma diária por dia), cancelamento e filtros.
- **Estoque:** itens com diária, caução e quantidade. Mostra quantas unidades estão livres, e a nova locação não deixa alugar mais do que há livre no período.
- **Clientes:** cadastro, histórico, quanto cada um deve e botão para chamar no WhatsApp.
- **WhatsApp:** enviar recibo da locação ou cobrar uma devolução atrasada com a mensagem pronta.
- **Relatórios (Pro):** recebido por mês, itens que mais faturam e quem está devendo.
- **Dados de exemplo:** na primeira abertura, um botão preenche o app com uma locadora de demonstração (bom para apresentar a clientes).

## Planos

Definidos em `src/constants/plano.ts`.

| | Grátis | Pro |
|---|---|---|
| Itens no estoque | 10 | sem limite |
| Clientes | 25 | sem limite |
| Locações por mês | 15 | sem limite |
| Relatórios | não | sim |
| Preço | R$ 0 | R$ 39,90/mês ou R$ 399/ano |

O Pro tem 7 dias de teste grátis (uma vez por aparelho).

**A cobrança ainda não está ligada.** O botão "Assinar" mostra um aviso. Para cobrar de verdade, falta:
1. Escolher o meio: RevenueCat (assinatura pela App Store e Google Play) ou Mercado Pago / Stripe (pagamento pela web).
2. Preencher `plano.proAte` com a data de validade que o meio de pagamento informar (`src/store/dados.tsx`).

## Dados

Nesta versão tudo fica salvo no aparelho (AsyncStorage). Para usar em vários celulares ou com funcionários,
o próximo passo é levar `src/store/dados.tsx` para um backend (por exemplo, Supabase) com login.

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
| Estado, gravação e ações (alugar, pagar, devolver) | `src/store/dados.tsx` |
| Tipos dos dados | `src/store/tipos.ts` |
| Dados de demonstração | `src/store/exemplo.ts` |
| Cores e espaçamentos | `src/constants/theme.ts` |
| Telas | `src/app/` (cada arquivo é uma rota) |

## Verificar antes de publicar

```bash
npx tsc --noEmit
npx expo lint
```

Para gerar o app instalável (APK/IPA): `npx eas-cli@latest build` (precisa de uma conta Expo).
