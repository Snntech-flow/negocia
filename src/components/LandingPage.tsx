"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileText,
  FileX,
  House,
  Lock,
  Menu,
  MessageSquare,
  UserX,
} from "lucide-react";
import OnboardingModal from "./OnboardingModal";
import { PLAN_IDS, PLANS, planCharge, planMonthlyEquivalent, type PlanId } from "@/lib/plans";
import { manrope } from "@/lib/fonte-landing";

// Página inicial (29/10/2026, ⚖️ Sidney: "o preto ficou melhor"): uma cor escura, laranja só nos botões, fundo branco.
// As cores moram aqui; trocar o preto por outra cor é mudar --nl-escuro. Nada de slate-* nem black: o tailwind.config
// repinta esses tons com o azul do app logado.
const CORES = {
  "--nl-escuro": "#121214",
  "--nl-laranja": "#e4610f",
  "--nl-laranja-forte": "#c9530a",
  "--nl-laranja-claro": "#f5b27a",
  "--nl-texto": "#1d1d1f",
  "--nl-suave": "#5d6066",
  "--nl-linha": "#e6e6e9",
  "--nl-claro": "#f6f6f7",
  "--nl-tinta": "#eeeeef",
  // Branco por variável no botão de escolha: o guard de tema (tests/theme.test.ts) barra text-white com aria-pressed.
  "--nl-branco": "#ffffff",
} as React.CSSProperties;

const DESTAQUES_DA_PARCERIA = [
  { icone: Lock, titulo: "Endereço e proprietário só com você", texto: "O endereço completo e o telefone do proprietário ficam visíveis apenas para quem cadastrou." },
  { icone: FileText, titulo: "Ficha para o cliente", texto: "O parceiro envia ao cliente dele uma ficha com o próprio WhatsApp e CRECI, sem o seu contato e sem o endereço." },
  { icone: Clock, titulo: "Registro de visita (DVP)", texto: "Quem visitou o imóvel, quando e com qual corretor. Nesta versão fica em rascunho: não coleta assinatura nem é garantia jurídica." },
  { icone: Check, titulo: "Termo de Parceria", texto: "A divisão confirmada pelos dois vira termo com cláusula de não atravessamento, com data, hora e IP. É só imprimir ou salvar em PDF." },
];

const RECURSOS_DO_PLANO = [
  "Fotos por anúncio conforme o plano",
  "Vitrine de imóveis para parcerias",
  "Endereço e proprietário visíveis só para o captador",
  "Radar de compradores e CRM",
  "Registro interno de visitas",
];

// Quantas dúvidas aparecem antes de "Ver todas as dúvidas".
const DUVIDAS_A_MOSTRAR = 6;

export default function LandingPage({
  onAccessPlatform,
}: {
  onAccessPlatform: (userData?: Parameters<React.ComponentProps<typeof OnboardingModal>["onComplete"]>[0]) => void;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanId>("20");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [todasAsDuvidas, setTodasAsDuvidas] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState("20");
  const [onboardingMode, setOnboardingMode] = useState<"register" | "login">("register");
  const [menuOpen, setMenuOpen] = useState(false);

  const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  const abrir = (modo: "register" | "login", plano: string = "20") => {
    setOnboardingMode(modo);
    setSelectedPlanForOnboarding(plano);
    setIsOnboardingOpen(true);
  };
  const navLinks = [
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#planos", label: "Planos" },
    { href: "#duvidas", label: "Dúvidas" },
  ];
  const plano = PLANS[planoEscolhido];
  // Preços da tabela vigente (a de quem se cadastra agora).
  const mensalCheio = planCharge(planoEscolhido, "monthly");
  const totalAnual = planCharge(planoEscolhido, "annual");
  const economiaNoAno = (Number(mensalCheio) * 12 - Number(totalAnual)).toFixed(2);

  // As 6 primeiras são as que aparecem de cara; as outras abrem em "Ver todas as dúvidas".
  const duvidas = [
    { q: "Como funcionam os 30 dias grátis?", a: "Cada corretor tem 30 dias gratuitos a partir do cadastro, sem pagamento inicial. Use esse período para conhecer a plataforma. A verificação do CRECI é feita pela equipe e é necessária para acessar as funções restritas." },
    { q: "Preciso pagar ou informar cartão para começar?", a: "Não. O cadastro inicia o período gratuito sem cobrança e sem cartão. Após os 30 dias, você pode renovar o plano via Pix." },
    { q: "Quem consegue ver os dados do proprietário?", a: "O endereço completo e os dados de contato do proprietário ficam restritos ao corretor que cadastrou o imóvel. Confira as informações da ficha antes de compartilhar com um cliente." },
    { q: "Meus clientes ficam visíveis para outros corretores?", a: "Sua carteira do CRM, contatos e histórico são privados. No Radar, preferências de busca podem ajudar a encontrar parcerias, sem expor o nome interno e as observações particulares do cliente." },
    { q: "O que é parceria 50/50 e 40/40/20?", a: "Em 50/50, a comissão é dividida entre o corretor que captou o imóvel e o corretor do comprador. Em 40/40/20, cada um fica com 40% e 20% vão para um corretor indicador — o caso de quem anuncia imóvel de outro corretor. Cada imóvel mostra se faz só 50/50, só 40/40/20 ou as duas, e o registro de visita só aceita a divisão que o imóvel aceita." },
    { q: "Como funciona o Radar de compradores?", a: "Ao cadastrar uma busca no Radar ou um novo imóvel de venda para parceria, o sistema cruza cidade, tipo, bairros, orçamento, quartos e vagas. Quando encontra compatibilidade, gera um aviso dentro do sistema para o corretor que procura. O Match não fecha a venda nem envia documentos automaticamente; os corretores confirmam os detalhes e combinam a parceria." },
    { q: "O que acontece depois do período gratuito?", a: "Para continuar usando as funções do plano, faça a renovação. Em Minha assinatura você consulta o prazo de acesso, o plano e o histórico de pagamentos. A cobrança não é automática." },
    { q: "Qual plano devo escolher?", a: `O plano define quantos anúncios você mantém ativos ao mesmo tempo: ${PLAN_IDS.map((id) => PLANS[id].listings).join(", ").replace(/, (\d+)$/, " ou $1")}. Imóveis vendidos, alugados ou arquivados não contam. O limite de fotos por imóvel acompanha o plano (de ${Math.min(...PLAN_IDS.map((id) => PLANS[id].photos))} a ${Math.max(...PLAN_IDS.map((id) => PLANS[id].photos))} fotos); os demais recursos são iguais em todos.` },
    { q: "Como ganho um mês grátis por indicação?", a: "Compartilhe seu link ou código de indicação, disponível em Minha assinatura. Quando a pessoa indicada tiver seu primeiro pagamento confirmado, você recebe mais 30 dias de acesso. O cadastro gratuito sozinho não gera a recompensa." },
    { q: "O que é a ficha para o cliente?", a: "É uma apresentação do imóvel com o seu nome, CRECI e WhatsApp, para enviar ao seu cliente. Mostra bairro e cidade, sem o endereço completo e sem os dados do captador. Confira antes de enviar." },
    { q: "O que posso fazer no CRM?", a: "Cadastrar clientes, organizar oportunidades no funil, registrar contatos, agendar retornos, filtrar a carteira e importar ou exportar contatos em CSV. Acesse CRM → Minha carteira." },
    { q: "O que é importar CSV?", a: "É trazer contatos de uma planilha para o CRM. CSV é um formato de arquivo que você pode salvar no Excel ou Google Planilhas. Na opção Importar contatos de uma planilha, confira as instruções e o modelo antes de enviar." },
    { q: "Posso cadastrar um imóvel que não aceita parceria?", a: "Pode, mas ele fica só na sua carteira, sem aparecer para a rede. Na vitrine, todo imóvel aceita parceria: ao publicar, você confirma isso e informa a condição daquele imóvel. Por isso não cadastre na rede um imóvel em que você não vai fazer parceria." },
    { q: "O Bartolomeu pode ajudar com financiamento?", a: "Sim. Ele ajuda com atendimento, organização do CRM e dúvidas sobre MCMV, SBPE, FGTS e financiamento. Pode pesquisar e apresentar fontes consultadas. Confirme regras e valores com o banco; a IA não aprova crédito nem garante subsídio. Não envie documentos ou dados pessoais de clientes." },
    { q: "A simulação de amortização é uma proposta do banco?", a: "Não. É uma estimativa matemática em SAC ou Price para comparar aportes que reduzem o prazo ou a parcela. Não inclui seguros, tarifas, TR/IPCA ou regras específicas da instituição. Confirme as condições no contrato e no banco." },
    { q: "O que é DVP? Ele vale como contrato assinado?", a: "DVP significa Documento de Visita Presencial. Na plataforma, ele registra os dados da visita como rascunho para acompanhamento. Esse registro não é assinatura eletrônica nem garante comissão; formalize os acordos entre as partes." },
    { q: "Como pedir ajuda ou sugerir melhorias?", a: "Depois de entrar, use o botão Ajuda no topo da tela. Sua mensagem vai para a equipe do Negocia Lar." },
  ];
  const duvidasVisiveis = todasAsDuvidas ? duvidas : duvidas.slice(0, DUVIDAS_A_MOSTRAR);

  const botao = "inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--nl-laranja)] px-7 py-4 text-base font-bold text-white transition hover:bg-[color:var(--nl-laranja-forte)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--nl-laranja)]";
  const sobretitulo = "text-[13px] font-bold uppercase tracking-[0.12em] text-[color:var(--nl-suave)]";
  const titulo = "text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[color:var(--nl-escuro)] [text-wrap:balance] md:text-[40px]";
  const apoio = "mt-4 max-w-[640px] text-[17px] leading-relaxed text-[color:var(--nl-suave)] md:text-[19px]";

  return (
    <div style={CORES} className={`${manrope.className} min-h-screen bg-white pb-24 text-[color:var(--nl-texto)] antialiased md:pb-0`}>
      {/* Topo: menu + abertura na cor escura */}
      <header className="bg-[color:var(--nl-escuro)] text-white">
        <div className="mx-auto max-w-[1160px] px-5">
          <div className="flex h-[68px] items-center justify-between md:h-[84px]">
            <a href="#" className="flex items-center gap-3 text-[22px] font-extrabold tracking-[-0.01em]">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-white">
                <Image src="/logo-negocialar.png" alt="Negocia Lar" fill sizes="40px" className="object-contain p-1" />
              </span>
              <span>Negocia<span className="text-[#f08a3c]">lar</span></span>
            </a>

            <nav aria-label="Seções" className="hidden items-center gap-9 text-[15px] font-semibold text-white/75 md:flex">
              {navLinks.map((link) => <a key={link.href} href={link.href} className="transition hover:text-white">{link.label}</a>)}
            </nav>

            <div className="flex items-center gap-3 md:gap-5">
              <button type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="menu-celular" onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-white/20 p-2 text-white md:hidden"><Menu className="h-5 w-5" /></button>
              <button type="button" onClick={() => abrir("login")} className="text-[15px] font-bold text-white">Entrar</button>
              <button type="button" onClick={() => abrir("register")} className="hidden rounded-[10px] bg-[color:var(--nl-laranja)] px-5 py-[11px] text-[15px] font-bold text-white transition hover:bg-[color:var(--nl-laranja-forte)] md:inline-flex">Começar grátis</button>
            </div>
          </div>
          {menuOpen && <nav id="menu-celular" aria-label="Seções" className="border-t border-white/10 py-2 md:hidden">
            {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-[15px] font-semibold text-white/80">{link.label}</a>)}
          </nav>}

          <div className="grid items-center gap-11 pb-[72px] pt-9 lg:grid-cols-[1.15fr_.85fr] lg:gap-16 lg:pb-28 lg:pt-[72px]">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-[7px] text-sm font-bold text-[color:var(--nl-laranja-claro)]">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[color:var(--nl-laranja-claro)]" />
                Match automático entre corretores
              </span>
              <h1 className="mb-[22px] mt-[26px] text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] md:text-[60px]">Chega de perder comissão e captação.</h1>
              <p className="max-w-[560px] text-lg leading-relaxed text-white/75 md:text-xl">Um corretor tem o imóvel, outro tem o cliente. O Negocia Lar cruza os dois e acompanha a parceria do primeiro contato à documentação.</p>
              <div className="mt-9 flex flex-col items-stretch gap-[18px] sm:flex-row sm:items-center sm:gap-7">
                <button type="button" onClick={() => abrir("register")} className={botao}>Começar 30 dias grátis</button>
                <a href="#planos" className="inline-flex items-center justify-center gap-2 font-bold text-white">Ver planos e preços <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-[22px] gap-y-2 text-[15px] text-white/60">
                {["Sem cartão no cadastro", "Renovação via Pix", "Sem taxa oculta"].map((item) => (
                  <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-white/85" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>

            {/* Exemplo de Match (ilustrativo) */}
            <div className="w-full min-w-0 rounded-[22px] bg-white p-[18px] text-[color:var(--nl-texto)] shadow-[0_30px_80px_rgba(0,0,0,.35)] md:p-[22px] lg:max-w-[440px] lg:justify-self-end">
              <div className="mb-4 flex items-center justify-between gap-2.5">
                <strong className="flex items-center gap-2.5 whitespace-nowrap text-[15px] md:text-base"><span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-emerald-600" />Novo Match no Radar</strong>
                <span className="whitespace-nowrap rounded-full border border-[color:var(--nl-linha)] bg-[color:var(--nl-claro)] px-2 py-[3px] text-[11px] font-bold text-[color:var(--nl-suave)] md:px-2.5 md:text-xs">Exemplo ilustrativo</span>
              </div>
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900" alt="Imagem ilustrativa de imóvel" className="block h-[190px] w-full rounded-[14px] object-cover md:h-[230px]" />
              <div className="mt-4 text-sm text-[color:var(--nl-suave)]">Bairro, cidade</div>
              <div className="mt-0.5 text-lg font-extrabold">Título do anúncio do captador</div>
              <div className="mb-[18px] mt-3.5 flex flex-wrap gap-2">
                {["Combina com a busca do seu cliente", "Parceria 50/50"].map((chip) => (
                  <span key={chip} className="rounded-full bg-[color:var(--nl-tinta)] px-3 py-1.5 text-[13px] font-bold text-[color:var(--nl-escuro)]">{chip}</span>
                ))}
              </div>
              <div className="rounded-xl border-[1.5px] border-[color:var(--nl-escuro)] py-[13px] text-center font-extrabold text-[color:var(--nl-escuro)]">Ver imóvel</div>
              <p className="mt-3.5 text-center text-[13px] text-[color:var(--nl-suave)]">Endereço e proprietário ficam só com quem captou.</p>
            </div>
          </div>
        </div>
      </header>

      {/* As situações que o corretor conhece */}
      <section className="py-[72px] md:py-[104px]">
        <div className="mx-auto max-w-[1160px] px-5">
          <p className={sobretitulo}>A realidade do mercado</p>
          <h2 className={`mt-3.5 ${titulo}`}>Você já passou por alguma dessas situações?</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              { icone: UserX, titulo: "O corretor atravessador", texto: "Você leva o corretor parceiro para visitar o imóvel com o cliente dele. Dias depois, descobre que ele foi direto no proprietário para tirar você da jogada." },
              { icone: MessageSquare, titulo: "Grupos de WhatsApp caóticos", texto: "Centenas de mensagens por dia, fotos com marca d'água de concorrentes, fichas sem endereço e zero histórico ou garantia formal de comissão." },
              { icone: FileX, titulo: "Cliente desviado sem provas", texto: "Você atende o cliente, mostra o imóvel, mas a venda é concretizada depois por outro intermediário e você fica sem provas documentais da mediação." },
            ].map(({ icone: Icone, titulo: t, texto }) => (
              <article key={t} className="min-w-0 border-t-2 border-[color:var(--nl-linha)] pt-7">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--nl-tinta)] text-[color:var(--nl-escuro)]"><Icone className="h-[22px] w-[22px]" aria-hidden="true" /></span>
                <h3 className="mb-2.5 mt-[18px] text-[21px] font-extrabold tracking-[-0.01em] text-[color:var(--nl-escuro)]">{t}</h3>
                <p className="text-base leading-relaxed text-[color:var(--nl-suave)]">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona: o Match explicado uma vez */}
      <section id="como-funciona" className="bg-[color:var(--nl-claro)] py-[72px] md:py-[104px]">
        <div className="mx-auto max-w-[1160px] px-5 text-center">
          <p className={sobretitulo}>Como funciona</p>
          <h2 className={`mt-3.5 ${titulo}`}>Quem tem o imóvel encontra quem tem o cliente.</h2>
          {/* Pedido da corretora piloto (14/10/2026): deixar claro que a rede é de imóveis que ACEITAM parceria. */}
          <p className={`${apoio} mx-auto`}>Na vitrine só entra imóvel que aceita parceria. Quem publica informa a condição daquele imóvel (só 50/50, só 40/40/20 ou as duas) e quem busca vê antes de entrar em contato. Imóvel sem parceria fica só na carteira de quem cadastrou.</p>
          <ol className="mt-14 grid gap-7 text-left md:grid-cols-3">
            {[
              { titulo: "Cadastre o que seu cliente procura", texto: "Cidade, tipo, bairros, orçamento, quartos e vagas. A busca fica no Radar; o nome e as observações do seu cliente continuam só com você." },
              { titulo: "O Match avisa você", texto: "Quando há um imóvel compatível para parceria, o sistema cruza os critérios e avisa o corretor que procura. O Match indica a compatibilidade; os corretores confirmam os detalhes." },
              { titulo: "A parceria fecha com documento", texto: "Os dois confirmam a divisão da comissão e a plataforma gera o Termo de Parceria, com cláusula de não atravessamento." },
            ].map((passo, i) => (
              <li key={passo.titulo} className="min-w-0 rounded-[20px] border border-[color:var(--nl-linha)] bg-white p-8">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[color:var(--nl-escuro)] text-[15px] font-extrabold text-white">{i + 1}</span>
                <h3 className="mb-2.5 mt-[22px] text-[22px] font-extrabold tracking-[-0.01em] text-[color:var(--nl-escuro)]">{passo.titulo}</h3>
                <p className="text-base leading-relaxed text-[color:var(--nl-suave)]">{passo.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12"><button type="button" onClick={() => abrir("register")} className={botao}>Começar 30 dias grátis</button></div>
        </div>
      </section>

      {/* O sistema: Vitrine, CRM e documentação */}
      <section id="sistema" className="py-[72px] md:py-[104px]">
        <div className="mx-auto grid max-w-[1160px] items-start gap-9 px-5 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div className="min-w-0">
            <p className={sobretitulo}>Muito além de uma vitrine</p>
            {/* ⚖️ Sidney 29/10/2026: "o Match" em laranja. */}
            <h2 className={`mt-3.5 ${titulo}`}>O <span className="text-[color:var(--nl-laranja)]">Match</span>, o CRM e a documentação no mesmo lugar.</h2>
            <p className={apoio}>Encontre oportunidades de parceria, organize seus clientes e prepare a documentação da negociação sem sair da plataforma.</p>
          </div>
          <div className="grid min-w-0 gap-3.5">
            {[
              { icone: House, titulo: "Vitrine só de parceria", texto: "Quem publica confirma a condição de cada imóvel, e o Radar avisa quando ele combina com a busca de outro corretor." },
              { icone: CalendarDays, titulo: "Seu CRM integrado", texto: "Organize clientes, acompanhe cada etapa da negociação e agende os próximos contatos. Sua agenda, suas anotações e seu histórico ficam privados na sua conta." },
              { icone: ClipboardCheck, titulo: "Da oportunidade à documentação", texto: "Personalize a lista de documentos e os custos da operação, acompanhe pendências e compartilhe a lista com o cliente pelo WhatsApp ou PDF. Salve seu modelo para reutilizar." },
            ].map(({ icone: Icone, titulo: t, texto }) => (
              <article key={t} className="grid grid-cols-[52px_1fr] gap-5 rounded-[18px] border border-[color:var(--nl-linha)] p-[26px]">
                <span className="grid h-[52px] w-[52px] place-items-center rounded-xl bg-[color:var(--nl-tinta)] text-[color:var(--nl-escuro)]"><Icone className="h-[22px] w-[22px]" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h3 className="text-[19px] font-extrabold text-[color:var(--nl-escuro)]">{t}</h3>
                  <p className="mt-1 text-base leading-relaxed text-[color:var(--nl-suave)]">{texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Parceria com regra */}
      <section className="bg-[color:var(--nl-escuro)] py-[72px] text-white md:py-[104px]">
        <div className="mx-auto max-w-[1160px] px-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white/60">O jeito profissional</p>
          <h2 className="mt-3.5 text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] [text-wrap:balance] md:text-[40px]">Parceria com regra, do primeiro contato ao termo.</h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-9">
            {DESTAQUES_DA_PARCERIA.map(({ icone: Icone, titulo: t, texto }) => (
              <article key={t} className="min-w-0">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.08]"><Icone className="h-[22px] w-[22px]" aria-hidden="true" /></span>
                <h3 className="mb-2 mt-5 text-[19px] font-extrabold">{t}</h3>
                <p className="text-[15.5px] leading-relaxed text-white/65">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Planos: escolhe a quantidade de anúncios e vê um cartão só */}
      <section id="planos" className="py-[72px] md:py-[104px]">
        <div className="mx-auto max-w-[1160px] px-5 text-center">
          <p className={sobretitulo}>Planos</p>
          <h2 className={`mt-3.5 ${titulo}`}>Quantos imóveis você anuncia?</h2>
          <p className={`${apoio} mx-auto`}>Para corretores com CRECI verificado pela equipe. O plano define quantos anúncios ficam ativos ao mesmo tempo; vendidos, alugados e arquivados não contam.</p>

          <div role="group" aria-label="Quantidade de anúncios" className="mt-9 grid w-full grid-cols-5 gap-1 rounded-[14px] border border-[color:var(--nl-linha)] bg-[color:var(--nl-claro)] p-[5px] sm:inline-grid sm:w-auto">
            {PLAN_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={planoEscolhido === id}
                aria-label={PLANS[id].name}
                onClick={() => setPlanoEscolhido(id)}
                className={`rounded-[10px] py-[11px] text-base font-bold tabular-nums transition sm:px-[22px] ${planoEscolhido === id ? "bg-[color:var(--nl-escuro)] text-[color:var(--nl-branco)]" :"text-[color:var(--nl-suave)] hover:text-[color:var(--nl-escuro)]"}`}
              >
                {PLANS[id].listings}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[15px] font-semibold text-[color:var(--nl-suave)]">
            <span className={billingCycle === "monthly" ? "text-[color:var(--nl-escuro)]" : ""}>Mensal</span>
            <button
              type="button"
              role="switch"
              aria-checked={billingCycle === "annual"}
              aria-label="Cobrança anual"
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="relative h-[26px] w-[46px] rounded-full bg-[color:var(--nl-linha)]"
            >
              <span aria-hidden="true" className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-[color:var(--nl-escuro)] transition-transform motion-reduce:transition-none ${billingCycle === "annual" ? "translate-x-5" : ""}`} />
            </button>
            <span className={billingCycle === "annual" ? "text-[color:var(--nl-escuro)]" : ""}>Anual</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-[3px] text-[13px] font-bold text-emerald-800">use 12, pague 11</span>
          </div>

          <div className="mx-auto mt-9 grid max-w-[760px] overflow-hidden rounded-[22px] border border-[color:var(--nl-linha)] text-left shadow-[0_20px_50px_rgba(0,0,0,.06)] md:grid-cols-2">
            <div className="min-w-0 p-7 md:p-9">
              <h3 className="text-[26px] font-extrabold text-[color:var(--nl-escuro)]">{plano.name}</h3>
              <p className="text-sm font-bold text-[color:var(--nl-suave)]">{plano.photos} fotos por anúncio</p>
              <p className="mt-2.5 text-base leading-relaxed text-[color:var(--nl-suave)]">{plano.description}</p>
              {/* ⚖️ Sidney 29/10/2026: no anual, o mês muda e o preço cheio aparece riscado — o corretor vê a diferença. */}
              <p className="mt-[22px] flex flex-wrap items-baseline gap-x-3 font-extrabold tabular-nums tracking-[-0.02em] text-[color:var(--nl-escuro)]">
                {billingCycle === "annual" && (
                  <span className="text-2xl font-bold text-[color:var(--nl-suave)]"><span className="sr-only">De </span><s>{money(mensalCheio)}</s><span className="sr-only"> por</span></span>
                )}
                <span className="text-[44px]">{money(planMonthlyEquivalent(planoEscolhido, billingCycle))}</span>
                <span className="text-base font-semibold tracking-normal text-[color:var(--nl-suave)]">/mês</span>
              </p>
              <p className="min-h-[22px] text-sm text-[color:var(--nl-suave)]">
                {billingCycle === "annual"
                  ? <>Cobrado no ano: {money(totalAnual)}. <strong className="font-bold text-emerald-800">Você economiza {money(economiaNoAno)} no ano.</strong></>
                  : <>No anual, sai por {money(planMonthlyEquivalent(planoEscolhido, "annual"))}/mês.</>}
              </p>
              <button type="button" onClick={() => abrir("register", planoEscolhido)} className={`${botao} mt-[22px] w-full`}>Começar 30 dias grátis</button>
              <p className="mt-2.5 text-center text-sm text-[color:var(--nl-suave)]">Sem cartão. Depois, renovação via Pix.</p>
            </div>
            <div className="min-w-0 bg-[color:var(--nl-claro)] p-7 md:p-9">
              <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-[color:var(--nl-suave)]">Em todos os planos</h4>
              <ul className="grid gap-3 text-base">
                {RECURSOS_DO_PLANO.map((recurso) => (
                  <li key={recurso} className="grid grid-cols-[22px_1fr] gap-2.5"><Check className="mt-1 h-4 w-4 text-[color:var(--nl-escuro)]" strokeWidth={3} aria-hidden="true" /><span>{recurso}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Dúvidas: as 6 principais e "Ver todas" */}
      <section id="duvidas" className="bg-[color:var(--nl-claro)] py-[72px] md:py-[104px]">
        <div className="mx-auto grid max-w-[1160px] gap-9 px-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="min-w-0">
            <p className={sobretitulo}>Dúvidas</p>
            <h2 className={`mt-3.5 ${titulo}`}>Perguntas diretas dos corretores.</h2>
          </div>
          <div className="min-w-0">
            {duvidasVisiveis.map((faq, idx) => (
              <div key={faq.q} className={`border-b border-[color:var(--nl-linha)] ${idx === 0 ? "border-t" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                  className="flex w-full items-center justify-between gap-5 py-[22px] text-left text-lg font-bold text-[color:var(--nl-escuro)]"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[color:var(--nl-suave)] transition-transform motion-reduce:transition-none ${openFaq === idx ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {openFaq === idx && <p className="-mt-2.5 max-w-[620px] pb-[22px] text-base leading-relaxed text-[color:var(--nl-suave)]">{faq.a}</p>}
              </div>
            ))}
            {!todasAsDuvidas && (
              <button type="button" onClick={() => setTodasAsDuvidas(true)} className="mt-7 inline-flex items-center gap-2 font-bold text-[color:var(--nl-escuro)]">
                Ver todas as dúvidas ({duvidas.length}) <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="py-[72px] text-center md:py-28">
        <div className="mx-auto max-w-[1160px] px-5">
          <h2 className="text-[34px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[color:var(--nl-escuro)] [text-wrap:balance] md:text-[46px]">Comece hoje, sem pagar nada.</h2>
          <p className={`${apoio} mx-auto`}>30 dias grátis em qualquer plano. Depois, renovação via Pix, sem débito automático.</p>
          <button type="button" onClick={() => abrir("register")} className={`${botao} mt-[34px]`}>Criar minha conta</button>
        </div>
      </section>

      <footer className="bg-[color:var(--nl-escuro)] py-12 text-[15px] text-white/65">
        <div className="mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center">
          <span className="text-[19px] font-extrabold text-white">Negocia<span className="text-[#f08a3c]">lar</span></span>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-7 gap-y-3">
            {navLinks.map((link) => <a key={link.href} href={link.href} className="hover:text-white">{link.label}</a>)}
            <button type="button" onClick={() => abrir("login")} className="hover:text-white">Entrar</button>
          </nav>
          <span>© 2026 SNNtech. Todos os direitos reservados.</span>
        </div>
      </footer>

      {/* No celular, o botão de começar fica sempre à mão */}
      {!isOnboardingOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--nl-linha)] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => abrir("register")} className={`${botao} w-full`}>Começar 30 dias grátis</button>
        </div>
      )}

      {/* Modal de Onboarding */}
      {isOnboardingOpen && <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={(userData) => {
          setIsOnboardingOpen(false);
          onAccessPlatform(userData);
        }}
        initialPlan={selectedPlanForOnboarding}
        initialMode={onboardingMode}
      />}
    </div>
  );
}
