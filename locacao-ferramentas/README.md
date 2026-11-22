# Aluga Ferramentas

App de locação de ferramentas feito com Expo (React Native) e Expo Router.

## O que o app faz

- **Catálogo:** 12 ferramentas em 5 categorias, com busca (sem diferenciar acentos), filtro por categoria e quantas unidades estão livres hoje.
- **Reserva:** escolha a data de retirada (próximos 14 dias), quantos dias (1 a 30) e se quer retirar na loja ou receber em casa.
  O app mostra o orçamento completo e avisa quando a ferramenta não está disponível no período.
- **Preço:** diária × dias, com desconto progressivo (5% a partir de 3 dias, 15% a partir de 7, 25% a partir de 15)
  e entrega por R$ 15,00. A caução é informada à parte.
- **Minhas locações:** reservas agrupadas por situação (agendada, em andamento, atrasada, devolvida, cancelada).
  Dá para cancelar uma reserva agendada e marcar a devolução.
- **Conta:** nome, celular (com máscara) e endereço. Na primeira reserva o formulário aparece na própria tela da ferramenta.

Os dados ficam salvos no aparelho (AsyncStorage). Ainda não há servidor nem pagamento.

## Rodar

```bash
npm install
npx expo start         # abre o QR code para o app Expo Go no celular
npx expo start --web   # versão para navegador
```

## Onde mexer

| O quê | Arquivo |
|---|---|
| Ferramentas, preços, caução e estoque | `src/data/ferramentas.ts` |
| Descontos e taxa de entrega | `src/lib/preco.ts` |
| Reservas, disponibilidade e dados salvos | `src/store/locacoes.tsx` |
| Cores e espaçamentos | `src/constants/theme.ts` |
| Telas | `src/app/` (cada arquivo é uma rota) |

## Verificar antes de publicar

```bash
npx tsc --noEmit
npx expo lint
```

Para gerar o app instalável (APK/IPA), use o EAS: `npx eas-cli@latest build` (precisa de uma conta Expo).
