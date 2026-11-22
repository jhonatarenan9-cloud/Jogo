export type Categoria = 'Elétricas' | 'Construção' | 'Jardinagem' | 'Pintura' | 'Limpeza';

export type Ferramenta = {
  id: string;
  nome: string;
  emoji: string;
  categoria: Categoria;
  precoDia: number;
  caucao: number;
  estoque: number;
  descricao: string;
  especificacoes: string[];
};

export const CATEGORIAS: Categoria[] = ['Elétricas', 'Construção', 'Jardinagem', 'Pintura', 'Limpeza'];

export const FERRAMENTAS: Ferramenta[] = [
  {
    id: 'furadeira-impacto',
    nome: 'Furadeira de impacto',
    emoji: '🔩',
    categoria: 'Elétricas',
    precoDia: 25,
    caucao: 150,
    estoque: 4,
    descricao: 'Fura concreto, tijolo, madeira e metal. Acompanha jogo de brocas e maleta.',
    especificacoes: ['750 W', 'Mandril de 13 mm', '220 V', 'Jogo com 10 brocas'],
  },
  {
    id: 'parafusadeira',
    nome: 'Parafusadeira a bateria',
    emoji: '🪛',
    categoria: 'Elétricas',
    precoDia: 20,
    caucao: 120,
    estoque: 5,
    descricao: 'Leve e sem fio, ideal para montar móveis e instalar prateleiras.',
    especificacoes: ['12 V', '2 baterias', 'Carregador bivolt', '15 pontas'],
  },
  {
    id: 'serra-circular',
    nome: 'Serra circular',
    emoji: '🪚',
    categoria: 'Elétricas',
    precoDia: 35,
    caucao: 250,
    estoque: 2,
    descricao: 'Cortes retos e precisos em madeira e compensado, com guia paralela.',
    especificacoes: ['1.400 W', 'Disco de 7 1/4"', 'Corte de até 63 mm', '220 V'],
  },
  {
    id: 'martelete',
    nome: 'Martelete rompedor',
    emoji: '🔨',
    categoria: 'Construção',
    precoDia: 60,
    caucao: 400,
    estoque: 2,
    descricao: 'Para demolição leve, quebra de piso e abertura de passagens em parede.',
    especificacoes: ['1.100 W', 'Encaixe SDS-Max', '10 J de impacto', 'Ponteira e talhadeira'],
  },
  {
    id: 'betoneira',
    nome: 'Betoneira 150 L',
    emoji: '🏗️',
    categoria: 'Construção',
    precoDia: 70,
    caucao: 500,
    estoque: 1,
    descricao: 'Prepara concreto e argamassa para pequenas e médias obras.',
    especificacoes: ['150 litros', 'Motor de 1/2 cv', 'Rodas para transporte', '220 V'],
  },
  {
    id: 'escada',
    nome: 'Escada extensível 7 m',
    emoji: '🪜',
    categoria: 'Construção',
    precoDia: 18,
    caucao: 100,
    estoque: 3,
    descricao: 'Escada de alumínio com dois lances e sapatas antiderrapantes.',
    especificacoes: ['Alumínio', 'Até 7 metros', 'Aguenta 120 kg', 'Sapatas de borracha'],
  },
  {
    id: 'cortador-grama',
    nome: 'Cortador de grama',
    emoji: '🌱',
    categoria: 'Jardinagem',
    precoDia: 40,
    caucao: 300,
    estoque: 3,
    descricao: 'Cortador elétrico com recolhedor, para gramados de até 500 m².',
    especificacoes: ['1.800 W', 'Corte de 38 cm', 'Recolhedor de 40 L', '5 alturas de corte'],
  },
  {
    id: 'rocadeira',
    nome: 'Roçadeira a gasolina',
    emoji: '🌾',
    categoria: 'Jardinagem',
    precoDia: 45,
    caucao: 350,
    estoque: 2,
    descricao: 'Para terrenos com mato alto e cantos difíceis. Acompanha fio e lâmina.',
    especificacoes: ['43 cc', 'Fio de náilon e lâmina', 'Cinto de apoio', 'Tanque de 1 L'],
  },
  {
    id: 'pistola-pintura',
    nome: 'Pistola de pintura',
    emoji: '🎨',
    categoria: 'Pintura',
    precoDia: 30,
    caucao: 180,
    estoque: 3,
    descricao: 'Pinta paredes, portões e móveis em bem menos tempo que o rolo.',
    especificacoes: ['650 W', 'Copo de 800 ml', 'Bicos de 3 tamanhos', 'Ajuste de vazão'],
  },
  {
    id: 'lixadeira-parede',
    nome: 'Lixadeira de parede',
    emoji: '🧱',
    categoria: 'Pintura',
    precoDia: 50,
    caucao: 350,
    estoque: 1,
    descricao: 'Lixa massa corrida e gesso com aspiração do pó, sem sujeira na casa.',
    especificacoes: ['750 W', 'Disco de 225 mm', 'Cabo extensível', 'Mangueira de aspiração'],
  },
  {
    id: 'lavadora-pressao',
    nome: 'Lavadora de alta pressão',
    emoji: '💦',
    categoria: 'Limpeza',
    precoDia: 35,
    caucao: 200,
    estoque: 4,
    descricao: 'Limpa calçadas, quintais, carros e fachadas com muito menos água.',
    especificacoes: ['1.700 libras', 'Mangueira de 5 m', 'Bico regulável', 'Reservatório de sabão'],
  },
  {
    id: 'aspirador-po-agua',
    nome: 'Aspirador de pó e água',
    emoji: '🧹',
    categoria: 'Limpeza',
    precoDia: 28,
    caucao: 150,
    estoque: 3,
    descricao: 'Aspira pó de obra e líquidos. Ótimo para a limpeza pós-reforma.',
    especificacoes: ['1.400 W', 'Tanque de 20 L', 'Função sopro', 'Bocais para piso e frestas'],
  },
];

export function buscarFerramenta(id: string) {
  return FERRAMENTAS.find((f) => f.id === id);
}
