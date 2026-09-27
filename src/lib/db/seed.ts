import {
  db,
  users,
  properties,
  buyerProfiles,
  partnerships,
  transactions,
  notifications,
  dvpCertificates,
} from "./index";

async function runSeed() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DESTRUCTIVE_NEGOCIAR_LAR_SEED !== "yes") {
    throw new Error("Seed destrutivo bloqueado. Em desenvolvimento, configure ALLOW_DESTRUCTIVE_NEGOCIAR_LAR_SEED=yes após confirmar o banco alvo.");
  }
  console.log("🌱 Populando banco de dados com estrutura real, planos oficiais e blindagem...");

  // Limpeza de tabelas para um seed limpo
  await db.delete(notifications);
  await db.delete(dvpCertificates);
  await db.delete(transactions);
  await db.delete(partnerships);
  await db.delete(buyerProfiles);
  await db.delete(properties);
  await db.delete(users);

  // 1. Criar Corretores com os 4 Planos Oficiais
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
      plan: "40",
      subscriptionStatus: "ativo",
      monthlyFee: "150.00",
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
      plan: "40",
      subscriptionStatus: "ativo",
      monthlyFee: "150.00",
      trustScore: 100,
      successfulDeals: 9,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor3] = await db
    .insert(users)
    .values({
      name: "Roberto Silveira Prado",
      email: "roberto.prado@corretor.com.br",
      creci: "178220-F",
      whatsapp: "(11) 97777-1122",
      city: "São Paulo",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      role: "corretor",
      plan: "40",
      subscriptionStatus: "ativo",
      monthlyFee: "150.00",
      trustScore: 96,
      successfulDeals: 32,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [masterUser] = await db
    .insert(users)
    .values({
      name: "Sidney Nunes",
      email: "sidney@snntech.com.br",
      creci: "MASTER-SNNTECH",
      whatsapp: "(11) 98765-4321",
      city: "São Paulo",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      role: "admin",
      plan: "40",
      subscriptionStatus: "ativo",
      monthlyFee: "150.00",
      trustScore: 100,
      successfulDeals: 50,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
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
      isVerified: true,
      verificationStatus: "aprovado",
      plan: "20",
      subscriptionStatus: "ativo",
      monthlyFee: "89.90",
      trustScore: 92,
      successfulDeals: 5,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  const [corretor5] = await db
    .insert(users)
    .values({
      name: "Juliana Mendes Castro",
      email: "juliana.castro@mendes.com.br",
      creci: "215670-F",
      whatsapp: "(11) 97111-2299",
      city: "Santos",
      state: "SP",
      isVerified: true,
      verificationStatus: "aprovado",
      plan: "10",
      subscriptionStatus: "ativo",
      monthlyFee: "59.90",
      trustScore: 90,
      successfulDeals: 3,
      bypassReports: 0,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    })
    .returning();

  // 2. Transações dos Planos Individuais Pagos
  await db.insert(transactions).values([
    {
      userId: corretor3.id,
      amount: "150.00",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Plano 40 Anúncios via Pix Itaú",
    },
    {
      userId: corretor1.id,
      amount: "150.00",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Plano 40 Anúncios via Pix Itaú",
    },
    {
      userId: corretor2.id,
      amount: "150.00",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Plano 40 Anúncios via Pix Itaú",
    },
    {
      userId: corretor4.id,
      amount: "89.90",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Plano 20 Anúncios via Pix Itaú",
    },
    {
      userId: corretor5.id,
      amount: "59.90",
      type: "mensalidade_pro",
      paymentMethod: "pix",
      status: "pago",
      description: "Assinatura Plano 10 Anúncios via Pix Itaú",
    },
  ]);

  // 3. Imóveis Blindados com Fotos
  const [prop1, prop2] = await db
    .insert(properties)
    .values([
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
    ])
    .returning();

  // 4. Radar de Compradores
  await db.insert(buyerProfiles).values([
    {
      brokerId: corretor2.id,
      clientInternalName: "Dr. Marcelo (Investidor)",
      propertyType: "Apartamento",
      city: "São Paulo",
      neighborhoods: ["Moema", "Vila Nova Conceição", "Itaim Bibi"],
      maxBudget: "1500000.00",
      minBedrooms: 2,
      minParkingSpots: 2,
      notes: "Cliente com carta de crédito pré-aprovada para pagamento imediato.",
      active: true,
    },
    {
      brokerId: corretor4.id,
      clientInternalName: "Família Vasconcelos",
      propertyType: "Casa em Condomínio",
      city: "Cotia",
      neighborhoods: ["Granja Viana", "Alphaville"],
      maxBudget: "2600000.00",
      minBedrooms: 4,
      minParkingSpots: 3,
      notes: "Buscam casa térrea ou com suíte no térreo.",
      active: true,
    },
  ]);

  // 5. Registro de visita de demonstração (sem aceite contratual)
  const visitDate = new Date();
  const lockExpiration = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  await db.insert(dvpCertificates).values({
    certificateHash: "DVP-E8A731F49B02D5",
    propertyId: prop1.id,
    captorBrokerId: corretor1.id,
    partnerBrokerId: corretor2.id,
    clientName: "Dr. Marcelo de Oliveira",
    clientPhone: "(11) 98888-1122",
    clientCpfPartial: "***.482.918-**",
    visitDate,
    lockExpirationDate: lockExpiration,
    commissionSplit: "50.00",
    status: "rascunho",
    legalClausesAccepted: false,
  });

  // 6. Notificações do Sininho
  await db.insert(notifications).values([
    {
      userId: corretor2.id,
      title: "🤖 IA Match: Moema Pássaros",
      message: `Encontramos 1 Apartamento de 3 Quartos em Moema compatível com o perfil do seu cliente Dr. Marcelo! Captado por Carlos Eduardo com 50/50 de parceria.`,
      type: "ai_match",
      read: false,
      propertyId: prop1.id,
    },
    {
      userId: corretor1.id,
      title: "Registro de visita em rascunho",
      message: "Foi criado um registro demonstrativo de visita. Ele não tem aceite eletrônico nem efeito contratual.",
      type: "dvp",
      read: false,
      propertyId: prop1.id,
    },
    {
      userId: corretor2.id,
      title: "🎉 Bem-vindo ao Negocia Lar!",
      message: "Seu plano de 40 captações está ativo. Garantia legal de 7 dias vigente perante o Art. 49 do CDC.",
      type: "sistema",
      read: true,
    },
  ]);

  console.log("✅ Seed completo! Banco de dados real 100% populado!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
