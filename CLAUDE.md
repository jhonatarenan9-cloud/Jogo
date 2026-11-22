# Mina Idle: guia para mudanças

O jogo inteiro está em `index.html` (HTML + CSS + JS, mundo 3D com three.js r128 via cdnjs).
A versão publicada para jogar é uma cópia desse arquivo sem `<html>/<head>/<body>`.

## Regra de ouro: economia
Sempre que adicionar ou mudar qualquer coisa (mina, ferramenta, ajudante, fundição, melhoria, recompensa),
revise a economia junto. O jogo não pode ficar fácil a ponto de perder a graça no começo.
O jogador deve sempre sentir que falta só mais um pouco para a próxima conquista.

- **Cada etapa custa mais que a anterior.** A próxima mina deve exigir uns 5 a 15 minutos de jogo ativo
  na mina atual, e menos se o jogador investir bem (fundição, ajudantes, ferramentas).
- **Investir na mina atual precisa compensar.** Itens da mina atual (fundição, esteiras, ajudantes,
  ferramenta dos ajudantes) custam uma fração do preço da próxima mina e aceleram bastante o caminho até ela.
- **Nada de saltos gigantes.** Recompensas de missão ficam em torno de 20% a 30% do próximo passo:
  ajudam, mas não pulam etapas.
- **Custos crescem exponencialmente** (multiplicadores entre 2,5x e 4x por nível) e os ganhos crescem mais devagar.
- **Sempre há um próximo objetivo visível:** missão atual, próxima mina, próximo item da fundição.
- Ao mudar valores, faça a conta do tempo até a próxima mina com e sem os investimentos e conte o
  resultado ao usuário.
- Saves antigos devem continuar funcionando (migração no carregamento) sem ganhar dinheiro de graça.

## Onde ficam os números
- `MINES`, `TOOLS`: valor do minério, preço e força das ferramentas.
- `STAFF_COST`, `HELPER_RATE`, `HELPER_TOOLS`, `MANAGER_*`: funcionários.
- `SMELTER_COST`, `BELT_COST`, `SELLBELT_COST`, `BELT_RATE`, `BAR_MULT`: fundição.
- `COAL_*`: mina de carvão (combustível das fundições).
- `sharpenCost`, `boostCost`, `AUTOSELL_COST`, `beltSpeedCost`, `coalDrillCost`: melhorias.
- `MISSIONS`: sequência de missões e recompensas.

## Testes
O ambiente não acessa o cdnjs. Para testar com Playwright, instale `three@0.128.0` via npm e
responda a URL do cdnjs com o arquivo local (`page.route`).
