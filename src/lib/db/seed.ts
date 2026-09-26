import { db, users, properties, buyerProfiles, partnerships, transactions } from "./index";

async function runSeed() {
  console.log("🌱 Populando banco de dados com usuários e faturamento...");

  // Limpar tabelas para um seed limpo
  await db.delete(transactions);
  await db.delete(partnerships);
  await db.delete(buyerProfiles);
  await db.delete(properties);
  await db.delete(users);

  // 1. Criar Corretores com Diferentes Perfis, Planos e Reputações
  const [corretor1] = await db
    .insert(users)
    .values({
      name: "Carlos Eduardo Silva",
      email: "carlos.silva@corretor.com.br",
      creci: "189420-F",
      whatsapp: "(11) 98765-4321",
      city: "São Paulo",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      plan: "pro",
      subscriptionStatus: "ativo",
      monthlyFee: "149.00",
      trustScore: 98,
      successfulDeals: 14,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor2] = await db
    .insert(users)
    .values({
      name: "Mariana Costa Ramos",
      email: "mariana.ramos@corretora.com.br",
      creci: "204112-F",
      whatsapp: "(11) 99123-8877",
      city: "São Paulo",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      plan: "pro",
      subscriptionStatus: "ativo",
      monthlyFee: "149.00",
      trustScore: 100,
      successfulDeals: 9,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor3] = await db
    .insert(users)
    .values({
      name: "Imobiliária Prime Jardins (Equipe)",
      email: "contato@primejardins.com.br",
      creci: "34980-J",
      whatsapp: "(11) 97777-1122",
      city: "São Paulo",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      plan: "enterprise",
      subscriptionStatus: "ativo",
      monthlyFee: "499.00",
      trustScore: 95,
      successfulDeals: 28,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor4] = await db
    .insert(users)
    .values({
      name: "Rodrigo Mendonça Alencar",
      email: "rodrigo.mendonca@alencar.com.br",
      creci: "192301-F",
      whatsapp: "(11) 98122-3344",
      city: "Campinas",
      state: "SP",
      isVerified: false,
      verificationStatus: "pendente",
      plan: "free",
      subscriptionStatus: "ativo",
      monthlyFee: "0.00",
      trustScore: 85,
      successfulDeals: 2,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor5] = await db
    .insert(users)
    .values({
      name: "Felipe 'Atravessador' Santos",
      email: "felipe.santos@email.com",
      creci: "174921-F",
      whatsapp: "(11) 96555-4433",
      city: "São Paulo",
      state: "SP",
      isVerified: false,
      verificationStatus: "suspenso",
      plan: "pro",
      subscriptionStatus: "cancelado",
      monthlyFee: "149.00",
      trustScore: 32,
      successfulDeals: 1,
      bypassReports: 3,
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  // 2. Criar Transações de Faturamento
  await db.insert(transactions).values([
    {
      userId: corretor3.id,
      amount: "499.00",
      type: "mensalidade_imobiliaria",
      paymentMethod: "cartao_credito",
      status: "pago",
      description: "Assinatura Plano Imobiliária (Até 10 Corretores)",
    },
    {
      userId: corretor1.id,
      amount: "149.00",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Mensal Corretor Pro",
    },
    {
      userId: corretor2.id,
      amount: "149.00",
      type: "mensalidade_pro",
      paymentMethod: "cartao_credito",
      status: "pago",
      description: "Assinatura Mensal Corretora Pro",
    },
    {
      userId: corretor1.id,
      amount: "1280.00",
      type: "taxa_plataforma_parceria",
      paymentMethod: "pix",
      status: "pago",
      description: "Taxa de Sucesso MLS (Fechamento Co-corretagem Moema)",
    },
  ]);

  // 3. Imóveis
  await db.insert(properties).values([
    {
      brokerId: corretor1.id,
      title: "Apartamento de Alto Padrão em Moema Pássaros",
      propertyType: "Apartamento",
      salePrice: "1280000.00",
      condoFee: "1450.00",
      iptu: "420.00",
      city: "São Paulo",
      neighborhood: "Moema",
      bedrooms: 3,
      suites: 2,
      bathrooms: 3,
      parkingSpots: 2,
      areaM2: "115.00",
      description: "Amplo living integrado à varanda gourmet envidraçada. Condomínio com lazer completo e portaria 24h blindada.",
      photos: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80",
      ],
      acceptsPartnership: true,
      splitPercentage: "50.00",
      confidentialAddress: "Alameda dos Arapanés, nº 842, Apto 112 - Bloco B",
      ownerName: "Roberto Mendonça de Almeida",
      ownerPhone: "(11) 98111-2233",
      status: "disponivel",
    },
    {
      brokerId: corretor1.id,
      title: "Casa Contemporânea em Condomínio Fechado",
      propertyType: "Casa em Condomínio",
      salePrice: "2450000.00",
      condoFee: "1200.00",
      iptu: "650.00",
      city: "Cotia",
      neighborhood: "Granja Viana",
      bedrooms: 4,
      suites: 4,
      bathrooms: 5,
      parkingSpots: 4,
      areaM2: "380.00",
      description: "Projeto arquitetônico moderno com pé direito duplo e piscina de borda infinita com vista para a mata.",
      photos: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
      ],
      acceptsPartnership: true,
      splitPercentage: "50.00",
      confidentialAddress: "Rua das Camélias, Condomínio Quinta da Granja, Lote 45",
      ownerName: "Dra. Patricia Siqueira",
      ownerPhone: "(11) 97444-5566",
      status: "disponivel",
    },
  ]);

  // 4. Radar de Compradores
  await db.insert(buyerProfiles).values({
    brokerId: corretor2.id,
    clientInternalName: "Dr. Marcelo (Investidor)",
    propertyType: "Apartamento",
    city: "São Paulo",
    neighborhoods: ["Moema", "Vila Nova Conceição", "Itaim Bibi"],
    maxBudget: "1500000.00",
    minBedrooms: 2,
    minParkingSpots: 2,
    notes: "Cliente tem carta de crédito aprovada de 1.5M.",
    active: true,
  });

  console.log("✅ Seed com usuários e faturamento concluído com sucesso!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
