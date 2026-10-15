// Listas do cadastro de imóvel: o formulário de cadastro, a edição em Meus imóveis e a validação do servidor usam estas.
type Option = { readonly id: string; readonly label: string };

export const SOLAR_POSITIONS = [
  { id: "nascente", label: "Nascente (Sol Manhã)" },
  { id: "norte_sul", label: "Norte / Sul" },
  { id: "poente", label: "Poente (Sol Tarde)" },
  { id: "nao_definido", label: "Não definido" },
] as const satisfies readonly Option[];

export const VIEW_TYPES = [
  { id: "frente", label: "Frente" },
  { id: "fundos", label: "Fundos" },
  { id: "lateral", label: "Lateral" },
  { id: "lagoa", label: "Lagoa / Mar" },
  { id: "av_principal", label: "Av. Principal" },
  { id: "nao_definido", label: "Não definido" },
] as const satisfies readonly Option[];

export const PURPOSES = [
  { id: "venda", label: "Venda" },
  { id: "aluguel", label: "Aluguel" },
  { id: "temporada", label: "Temporada" },
] as const satisfies readonly Option[];

export const CONDITIONS = [
  { id: "novo", label: "Novo / pronto" },
  { id: "usado", label: "Usado" },
  { id: "em_construcao", label: "Em construção" },
  { id: "na_planta", label: "Na planta" },
] as const satisfies readonly Option[];

export const GARAGE_TYPES = [
  { id: "coberta", label: "Coberta" },
  { id: "descoberta", label: "Descoberta" },
] as const satisfies readonly Option[];

export const DOCUMENTATION_STATUSES = [
  { id: "escriturado", label: "Escriturado e registrado" },
  { id: "promessa_compra_venda", label: "Promessa de compra e venda / cessão" },
  { id: "inventario", label: "Inventário / em regularização" },
] as const satisfies readonly Option[];

export const IPTU_PERIODS = [
  { id: "anual", label: "Anual" },
  { id: "mensal", label: "Mensal" },
] as const satisfies readonly Option[];

export type SolarPosition = typeof SOLAR_POSITIONS[number]["id"];
export type ViewType = typeof VIEW_TYPES[number]["id"];
export type Purpose = typeof PURPOSES[number]["id"];
export type Condition = typeof CONDITIONS[number]["id"];
export type GarageType = typeof GARAGE_TYPES[number]["id"];
export type DocumentationStatus = typeof DOCUMENTATION_STATUSES[number]["id"];

export function optionLabel(options: readonly Option[], id: string | null | undefined) {
  return options.find((option) => option.id === id)?.label ?? null;
}

export const PROPERTY_TYPES = [
  "Apartamento", "Casa em Condomínio", "Casa Solta", "Cobertura", "Comercial", "Duplex", "Terreno",
  "Chácara", "Sítio", "Fazenda", "Hotel", "Pousada", "Loft", "Apart-Hotel",
];

export const PRIVATE_AMENITIES_LIST = [
  "Ar-condicionado", "Armário embutido / Closet", "Box blindex", "Cozinha americana", "Cozinha planejada",
  "Churrasqueira privativa", "Despensa", "Dependência de empregada (DCE)", "Escritório", "Home office", "Lavabo",
  "Mezanino", "Internet / Wi-Fi", "TV a cabo instalada", "Sofá retrátil", "Mobiliado", "Piscina privativa", "Sacada",
  "Sacada gourmet", "Varanda", "Varanda gourmet", "Ofurô", "Hidromassagem", "Sauna privativa", "Ventilador de teto",
  "Ar-condicionado central", "Painel de energia solar", "Adega", "Torneiras com água quente",
  "Sistema de automação residencial", "Cofre", "Poço artesiano", "Fechadura eletrônica", "Piso aquecido",
  "Captação de água da chuva",
];

export const CONDO_AMENITIES_GROUPS = [
  {
    category: "Lazer & Convivência",
    items: [
      "Piscina adulto", "Piscina infantil", "Piscina aquecida / coberta", "Deck molhado", "Piscina com deck no rooftop", "Sky lounge", "Sauna", "Spa / Hidromassagem",
      "Espaço gourmet", "Salão de festas", "Churrasqueira coletiva", "Salão de jogos", "Cinema / Home theater",
      "Espaço kids / Brinquedoteca", "Playground", "Parque infantil", "Coworking / Sala de reunião", "Pista de cooper / caminhada",
      "Área verde / Bosque preservado", "Pet place / Pet care", "Haras / Hípica", "Heliponto", "Parque aquático",
      "Lavanderia compartilhada", "Bar / Restaurante",
    ],
  },
  {
    category: "Esportes & Saúde",
    items: ["Academia completa (Fitness)", "Academia ao ar livre", "Quadra poliesportiva", "Quadra de tênis", "Quadra de beach tennis", "Campo de futebol"],
  },
  {
    category: "Segurança, Tecnologia & Infraestrutura",
    items: [
      "Portaria 24 horas", "Portaria remota / virtual", "Portaria blindada", "Reconhecimento facial / Biometria",
      "Câmeras CFTV 24h", "Gerador de energia", "Elevador social e de serviço", "Mini-mercado 24h",
      "Carregador para carro elétrico", "Garagem com vagas rotativas",
    ],
  },
];
