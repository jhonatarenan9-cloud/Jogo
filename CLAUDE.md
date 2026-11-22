# Mina Idle: guia para mudanças

O jogo inteiro está em `index.html` (HTML + CSS + JS, mundo 3D com three.js r128).

## Publicação (sempre as duas)
- **App (GitHub Pages):** o GitHub Pages publica o branch `(root)` (nome com parênteses, é o branch padrão do repositório).
  O usuário autorizou: depois de cada push no branch de trabalho, envie também para ele com
  `git push origin 'HEAD:refs/heads/(root)'`, para o app no celular atualizar sozinho.
  O app usa `three.min.js` local, `manifest.webmanifest`, ícones e `sw.js` (offline; o `index.html` vem da rede
  primeiro, para as atualizações chegarem). Se mudar a lista de arquivos do jogo, atualize `FILES` em `sw.js`
  e troque o nome do `CACHE`.
- **Link do Claude (Artifact):** gere com `python3 tools/gerar_versao_claude.py <saida.html>` e publique esse arquivo.
  O script remove os blocos `APP:START/APP:END` e troca o three.js local pelo cdnjs.

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
- `SHARPEN_BONUS`, `BOOST_BONUS`, `TURBO_BONUS`, `DRILL_BONUS`: bônus por nível das melhorias (mantenha baixos).
- `sharpenCost`, `boostCost`, `AUTOSELL_COST`, `beltSpeedCost`, `coalDrillCost`: melhorias.
- `DEPOT_COST`, `DELIVERY_MULT`, `TRUCK_COSTS`, `LOADER_COSTS`, `COLLECTOR_COST`, `bagCap`, `truckCap`, `collectorCap`: área de entregas. A Metalúrgica (`DELIVERY_MULT`) deve pagar um pouco mais que a barra da fundição (`BAR_MULT/ORES_PER_BAR`), sem exagero.
- `MISSIONS`: sequência de missões e recompensas.
- `SM_WEAR_TIME`, `TRUCK_WEAR_TRIP`, `MIN_EFF`: manutenção (desgaste e custo de conserto).
- `GEM_CHANCE`, `GEM_DELIVERY_CHANCE`, `GEM_ITEMS`: gemas raras e itens da loja de gemas (bônus pequenos).
- `POWER_ITEMS`, `powerStep`, `boilerCost`, `ENERGY_PER_COAL`, `BATTERY_*`: usina de energia (britadores com operadores, lavadora com maquinista,
  caldeira com 2 ajudantes, turbina, banco de baterias). Bateria rende pouco por segundo de propósito.
- `OIL_ITEMS`, `oilStep`, `fuelCap`, `pumpCost`, `GAL_*`, `DRUM_*`, `FUEL_BOOST`, `TRUCK_FUEL`, `COLLECTOR_FUEL`: campo de petróleo
  (4 bombas com funcionários, 2 separadores com maquinistas, carregadeira, refinaria, posto de galões). Galão rende pouco por segundo de propósito.
- **Rede integrada:** `gridTick` (energia: `GEN_*` geradores a carvão + usina + baterias; `powerDemand` = esteiras + postes + refinaria;
  `beltPower` para as esteiras), combustível obrigatório para caminhões e coletadores (`useFuel`, `FUEL_BUY_*` compra cara no galpão).
- `FOREST_ITEMS`, `forStep`, `treeGrow`, `forestLvlCost`, `TORAS_PER_TREE`, `SACK_VALUE`, `PAPER_VALUE`: floresta a leste das minas (lenhadores, adubadores, trator florestal, serraria, carvoaria, fábrica de papel com energia). Terreno $12 mil, tudo ~$112 mil; rende ~$45/s no nível 0.
- `STAGE_PAY`: lucro por etapa do carvão e do petróleo (carvão bruto, britagem, lavagem, caldeira, extração, separação, refino). Mantenha bem abaixo do produto final.
- `SELL_ITEMS`: aba 💰 Vender (lado direito): preço de venda de cada produto das etapas e dos finais. Cada etapa vale mais que a anterior e menos que terminar a cadeia; carvão bruto bem barato (não pode render mais que um ajudante do Cobre).
- `MARKET_*`, `mk`, `mval`, `marketTick`: mercado vivo (preço de cada produto varia entre 0,7x e 1,4x, média 1,0x, a cada 30 s). Todo valor de minério passa por `mval(m)`.
- `DEAL_*`, `dealPool`: pedidos do mercado (quantidade fixa por +40%, 5 min para entregar).
- `CAR_GAL_MULT`, `carBuy`, `updateCars`: carros da rodovia que param no posto e compram galões (um pouco acima do preço de venda do galão).
- `PR_ITEMS`, `prGain`, `doPrestige`, `goal()`: prestígio (aba ⭐ Era, lado direito). Depois de virar Magnata, recomeça com estrelas (raiz dos milhões ganhos na era) para melhorias permanentes; a meta de esmeraldas dobra a cada era. Mantém estrelas, gemas, itens de gema e conquistas.
- `ACHS`: conquistas (metas e recompensas por medalha; mantenha as recompensas pequenas).

## Começo do jogo
Jogo novo começa com `START_MONEY` ($1.000). O bônus de teste de $10 milhões foi removido.

## Testes
O `index.html` usa o `three.min.js` local, então dá para testar com Playwright servindo a pasta
(`python3 -m http.server`) ou abrindo o arquivo direto.
