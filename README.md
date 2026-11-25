# ⛏️ Mina Idle

Jogo idle de mineração em 3D no navegador. Abra o `index.html` para jogar.

## Instalar como app no celular
O jogo funciona como app (PWA) pelo GitHub Pages: abra o endereço do jogo no Safari (iPhone) ou no Chrome (Android)
e escolha **Adicionar à Tela de Início**. Ele abre em tela cheia, funciona sem internet e se atualiza sozinho
sempre que uma nova versão é enviada para o repositório.

## Visual cartoon
Tela de abertura, câmera isométrica, cartões flutuando sobre cada mina e fábrica (nome, ganho por segundo, nível e botão verde de melhorar), barra azul no topo e na base, e janela de "Bem-vindo de volta" com o que a equipe ganhou fora (dá para dobrar com 1 gema).

## Como jogar
- O jogo começa em **primeira pessoa**: lado esquerdo da tela anda, lado direito olha em volta (no computador: W/S andam, A/D ou setas giram). O botão **👁️** troca para a visão de cima (3ª pessoa).
- Pare perto das pedras de uma mina aberta: o mineiro golpeia sozinho e o minério cai na pilha ao lado.
- Pise no quadrado **💰 VENDER** do Mercado para vender tudo, ou no **🛠️ LOJA** para abrir a loja.
- Cada mina e operação tem uma placa de madeira com o cartão pintado nela (nível, ganho e botão Melhorar): toque na placa para abrir o painel com todas as melhorias daquele lugar (equipe, ferramenta, gerente, fundição, esteiras, coletador, caminhões, carregadores).
- O jogo ocupa a tela toda. Os botões Loja, Minério, Funcionários e Minas, embaixo, abrem janelas por cima do mapa.
- Cada mina fechada tem um quadrado com o preço da ferramenta na frente do portão. Fique em cima dele para ir pagando; quando completar, o portão abre.
- Cada mina nova é cara. Vale a pena completar a fundição da mina atual (fundição, esteira de minério e esteira de venda), que custa pouco e quadruplica o que você ganha, antes de comprar a próxima.
- **⚫ Mina de Carvão** (separada na ponta esquerda, maior que as outras, com torre de mineração, pilha grande e galpão de estoque com caixotes de carvão; aberta desde o início): o carvão é o combustível das fundições. Cada barra queima 1 carvão e, sem carvão, as fundições param. A mina de Carvão não tem fundição: o carvão fica acumulando desde o início e, quando você abre a primeira fundição, a **Esteira de Carvão** é montada sozinha e leva o estoque por trás das minas até todas as fundições. Contrate ajudantes e gerente na mina de Carvão para ter combustível suficiente.
- São 5 níveis, cada um exige uma ferramenta:
  1. Cobre — Picareta de Madeira (inicial)
  2. Ferro — Picareta de Ferro
  3. Ouro — Britadeira
  4. Diamante — Máquina Carregadeira
  5. Esmeralda — Escavadeira Gigante
- Na aba **👷 Funcionários**, contrate até 3 ajudantes por mina. Eles mineram sozinhos, cada um na sua mina.
- Os ajudantes começam com ⛏️ **Picareta**. Em cada mina dá para melhorar a ferramenta deles para 🔩 **Martelete** (1,4x) e depois 💥 **Rompedor** (2x); a ferramenta muda na mão dos bonecos.
- Cada mina também pode ter um **👔 Gerente** (mais caro), que faz os ajudantes daquela mina trabalharem 1,5x mais rápido.
- Na aba **🏭 Fundição** da Loja: Cada mina tem a sua própria fundição dentro do cercado (compre na loja ou pisando no quadrado 🏭). Depois compre a esteira daquela mina: ela leva o minério da pilha até a fornalha, que transforma 5 minérios em 1 barra valendo 20x o minério (4x mais dinheiro que vender o minério bruto).
- Com a fundição de uma mina construída, compre a **💵 Esteira de Venda** dela: leva as barras até uma caixa de venda na frente da mina e vende tudo sozinha.
- Melhorias: afiar ferramenta, manutenção e vendedor automático.
- O progresso é salvo no navegador, e você ganha minério mesmo offline (25%, até 4h).
- **📦 Área de Entregas** (sul do vilarejo): desbloqueie o galpão e leve minério até ele na 🎒 mochila ou com os 🛺 **coletadores** (um por mina, buscam o minério na pilha). Os 🧑‍🏭 **carregadores** (até 4, um por caminhão) põem as caixas nos 🚚 **caminhões** (até 4), que levam tudo à Metalúrgica Aurora. Ela paga 5x o preço do Mercado, um pouco mais que a barra da fundição (4x). Nas minas com fundição e coletador, a pilha é dividida (padrão 50% / 50%, ajustável em 25%, 50% ou 75% para a fundição).
- **⚡ Usina de Energia** (à esquerda da mina de Carvão), em setores: 2 Britadores (cada um com operador) → Lavadora Industrial (com maquinista) → Caldeira (2 ajudantes levam o carvão da lavadora) → Turbina → Banco de Baterias. A energia acende os postes (ajudantes +20%) e acelera as esteiras (+40%); o que sobra vira baterias para vender ($100 cada) no painel da usina ou no Mercado.
- **🛢️ Campo de Petróleo** (área grande perto do lago): 4 Bombas (cavalinhos, cada uma com funcionário) → 2 Separadores (com maquinistas) → tambores nos paletes → Carregadeira leva à Refinaria → Posto enche galões. Os galões vão ao galpão abastecer caminhões e coletadores (+50% de velocidade) e o que sobra é vendido ($120 cada).
- **🔄 Rede integrada:** fundições, esteiras e postes só funcionam com ⚡ energia da Usina (que queima o carvão da mina de Carvão; baterias como reserva). Caminhões e coletadores só andam com ⛽ combustível do Posto do Campo de Petróleo, cuja refinaria também precisa de energia. Não dá para comprar energia nem combustível: uma parte depende da outra.
- **📊 Estatísticas:** quanto cada mina rende por minuto e a comparação Mercado × Fundição × Galpão.
- **🔧 Manutenção:** fundições e caminhões se desgastam e rendem menos (até 50%); conserte tudo no botão **🔧 Manutenção** da barra de baixo (a bolinha vermelha mostra quantas máquinas precisam de conserto).
- **💎 Gemas raras:** caem ao minerar com a picareta e nas entregas. Compre itens especiais na Loja → Gemas.
- **🏆 Conquistas e Troféus:** 52 medalhas (bronze, prata e ouro) em 18 categorias, com pequenas recompensas, título de minerador e um pódio de troféus na praça.
- **🎯 Missões:** uma sequência de 32 objetivos com recompensa em dinheiro, sempre mostrando a próxima conquista no topo da tela.
- Objetivo final: minerar 8 milhões de esmeraldas e virar Magnata da Mineração (a meta dobra a cada Nova Era).
- **⛰️ Pedreira, Blocos e Concreto:** explosões no paredão, ajudantes e carregadeiras levam as pedras ao britador, a esteira forma o monte de brita (estoque central) e caminhões vendem. Depois: fábrica de blocos (misturador, prensa, cura, paletes) e usina de concreto usinado com caminhões-betoneira.
- **🚜 Fazenda:** ovelhas (lã), vacas (leite), galinhas (ovos), gado e porcos (carne, com reprodução e crescimento). Funcionários, máquinas de processamento, esteiras, estoques e caminhões; ração automática descontada das vendas.
