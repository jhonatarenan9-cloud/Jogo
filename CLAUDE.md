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
- `GEM_CHANCE`, `GEM_DELIVERY_CHANCE`, `GEM_ITEMS`: gemas raras (~10 por hora minerando ativamente) e itens da loja de gemas (8 a 25 gemas, 101 no total; bônus pequenos).
- `POWER_ITEMS`, `powerStep`, `boilerCost`, `ENERGY_PER_COAL`, `BATTERY_*`: usina de energia (britadores com operadores, lavadora com maquinista,
  caldeira com 2 ajudantes, turbina, banco de baterias). Bateria rende pouco por segundo de propósito.
- `OIL_ITEMS`, `oilStep`, `fuelCap`, `pumpCost`, `GAL_*`, `DRUM_*`, `FUEL_BOOST`, `TRUCK_FUEL`, `COLLECTOR_FUEL`: campo de petróleo
  (4 bombas com funcionários, 2 separadores com maquinistas, carregadeira, refinaria, posto de galões). Galão rende pouco por segundo de propósito.
- **Rede integrada (tudo depende de tudo):** não existe gerador nem compra de combustível. A energia só vem da ⚡ Usina
  (`gridTick`, baterias); `powerDemand` = esteiras + postes + refinaria + papeleira; sem energia, fundições e esteiras param (`beltPower`).
  Caminhões e coletadores só andam com combustível do ⛽ Posto (`useFuel`), e a refinaria precisa de energia.
  Por isso a primeira etapa da usina é barata (~$1,4 mil, logo depois da fundição do Cobre) e o caminho até o posto custa ~$9,7 mil.
  O Banco de Baterias ($10 mil) fica para depois. Saves antigos com gerador recebem de volta o que pagaram nele.
- `FOREST_ITEMS`, `forStep`, `treeGrow`, `forestLvlCost`, `TORAS_PER_TREE`, `SACK_VALUE`, `PAPER_VALUE`: floresta a leste das minas (lenhadores, adubadores, trator florestal, serraria, carvoaria, fábrica de papel com energia). Terreno $12 mil, tudo ~$112 mil; rende ~$45/s no nível 0.
- **Pedreira (leste da floresta, x 78–114):** `QUARRY_OPEN_COST`, `Q_BUY` (compras únicas/em sequência), `Q_UP` (melhorias, custo base × 2,6^nível, até 10),
  `BRITA_VALUE` ($10/t), `BLOCKS_PER_T`/`BLOCK_VALUE` (blocos rendem ~$18 por t de brita), `CONC_VALUE` ($45/m³, 1 t de brita por m³).
  `quarryStep` roda tudo em passos de 0,5 s (funciona offline). As três fases dividem o estoque central `S.quarry.brita`; os caminhões de brita deixam 25% de reserva quando há fábricas.
  Fase 2 libera com a pedreira no nível 6 (`blocksUnlocked`), fase 3 com a fábrica de blocos no nível 4 (`concUnlocked`).
  Insumos externos (cimento, areia, água, argamassa, aditivos) estão em `QUARRY_SUPPLIES` como automáticos; futuras indústrias entram ali (`supplyOk`).
- **Lago (sul da pedreira):** `LAKE_OPEN_COST` ($15 mil, libera com a fábrica de blocos), `L_BUY` (bomba, draga, escavadeira, operadores, caçambas), `L_UP`.
  Água (reservatório → adutora → caixa d'água), areia (draga) e argila (escavadeira) vão ao pátio do lago; caçambas levam areia/argila ao pátio de insumos da fábrica.
  `lakeUse(LAKE_USE.x, q)` consome de verdade; a parte feita com insumos próprios rende +`LAKE_BONUS` (80%). Cada estação paga `STAGE_PAY` (bombeamento, dragagem, escavação).
- **Estradas:** `asphalt()` registra cada avenida em `ROADS` (árvores/flores não nascem em cima; o personagem anda +30% no asfalto via `onRoad`). Avenidas em x=`AVE_A` (24) e `AVE_B` (-64,5), Rua do Galpão (x=0) e rodovia até `HWY_E` (74). Carros fazem circuitos rodovia → avenida → estrada principal → outra avenida em `spawnCar`.
- `STAGE_PAY`: lucro por etapa do carvão e do petróleo (carvão bruto, britagem, lavagem, caldeira, extração, separação, refino). Mantenha bem abaixo do produto final.
- `SELL_ITEMS`: aba 💰 Vender (lado direito): preço de venda de cada produto das etapas e dos finais. Cada etapa vale mais que a anterior e menos que terminar a cadeia; carvão bruto bem barato (não pode render mais que um ajudante do Cobre).
- `MARKET_*`, `mk`, `mval`, `marketTick`: mercado vivo (preço de cada produto varia entre 0,7x e 1,4x, média 1,0x, a cada 30 s). Todo valor de minério passa por `mval(m)`.
- `DEAL_*`, `dealPool`: pedidos do mercado (quantidade fixa por +40%, 5 min para entregar).
- `CAR_GAL_MULT`, `carBuy`, `updateCars`: carros da rodovia que param no posto e compram galões (um pouco acima do preço de venda do galão).
- `PR_ITEMS`, `prGain`, `doPrestige`, `goal()`: prestígio (aba ⭐ Era, lado direito). Depois de virar Magnata, recomeça com estrelas (raiz das dezenas de milhões ganhos na era, ~10 estrelas com $1 bilhão) para melhorias permanentes; a meta de esmeraldas cresce 50% a cada era; Herança dá $2 mil/5 mil/12 mil. Mantém estrelas, gemas, itens de gema e conquistas.
- `ACHS`: conquistas (metas e recompensas por medalha; mantenha as recompensas pequenas).

## XP e níveis
`XP_CFG` (valores por ação), `xpNeed(l) = 100·l^1,5`, `XP_TITLES`, `LVL_REQ` (níveis mínimos: banco de baterias 8, floresta 9, pedreira 10,
blocos 12, lago 13, concreto 15 — escolhidos pelo simulador para nunca travar quem já tem o dinheiro). O XP entra por ganchos em `hookXP`
(só quando o dinheiro ou o estado muda: compra que falha não dá XP) e por `xpMilestones` (faturamento/minério dobrando e um "turno" a cada
2 min produzindo = 4% do nível, que também roda offline). Recompensa por nível em `levelReward` (~1,5 min de produção; gema a cada 5;
+2% de produção a cada 10; ×1,5 por 10 min a cada 25; gemas extras a cada 50/100). Ritmo simulado: nível 10 em 30 min, 13 em 1h, 21 em 6h,
~43 em 24h. O nível passa de uma Era para a outra. Saves antigos recebem XP retroativo pelo que já construíram (sem dinheiro de níveis).

## Simulador de economia (use sempre que mexer em valores)
`node tools/simular_economia.js [horas] [barato|minas|equipe|fabricas|todas]`: um robô joga com as funções reais do jogo (em segundos)
e mostra quando compra cada mina/fábrica e de onde vem o dinheiro. Metas atuais (jogo ativo):
Ferro 15–22 min · Ouro 30–45 min · Diamante 1h20–3h30 · Esmeralda 3–9h · Magnata ~22–30h (`GOAL` = 8 milhões de esmeraldas, +50% por era).
Números pequenos de propósito: minério $1/3/9/25/70 (~3x por mina), ferramentas $2 mil/20 mil/200 mil/2 milhões (10x),
esteiras de fundição limitadas (`BELT_RATE` 3–8 minérios/s) e Turbo caro, para o fim de jogo ficar nos milhões e não em bilhões.
Custos de cada mina (fundição, esteiras, coletor, ajudantes) acompanham ~27% do preço da próxima ferramenta.
O robô não simula caminhões de entrega (rodam no 3D), então o jogo real fica um pouco mais rápido.

## Offline e números
Offline: `OFFLINE_RATE` (25%) até `OFFLINE_MAX` (4 h), simulado em passos de 10 s; relógio voltando não paga nada; janela mostra relatório.
`fmt` corta casas (nunca mostra "1000K"). Sons em `sfx()` (botão 🔊 desliga, `S.mute`).

## Começo do jogo
Jogo novo começa com `START_MONEY` ($1.000). O bônus de teste de $10 milhões foi removido.

## Testes
O `index.html` usa o `three.min.js` local, então dá para testar com Playwright servindo a pasta
(`python3 -m http.server`) ou abrindo o arquivo direto.
