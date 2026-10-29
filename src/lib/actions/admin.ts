// Ações da Administração (corretores e pagamentos). Movidas de actions.ts (Fase 0) — comportamento idêntico.
// Impl crus (lançam ActionError); o embrulho runAction fica no barrel actions.ts, como já era.
import { ActionError } from "../action-result";
import { db, users, transactions, notifications } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "../auth";
import { addFreeDays, extendPaidPeriod } from "../subscription";
import { municipioDaUf } from "../municipios";

export async function updateUserStatusImpl(userId: string, newStatus: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (!["pendente", "aprovado", "suspenso"].includes(newStatus)) throw new ActionError("Status inválido.");
  if (userId === actor.id) throw new ActionError("Você não pode mudar a situação da sua própria conta.");
  const reviewedAt = new Date();
  const [updated] = await db
    .update(users)
    .set({
      verificationStatus: newStatus,
      isVerified: newStatus === "aprovado",
      verificationReviewedBy: actor.id,
      verificationReviewedAt: reviewedAt,
      ...(newStatus === "suspenso" ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
      updatedAt: reviewedAt,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!updated) throw new ActionError("Corretor não encontrado.");

  revalidatePath("/");
  return { success: true, reviewedBy: actor.id, reviewedAt };
}

// Cidade e UF do CRECI de uma conta (28/10/2026, Sidney: "onde é São Paulo, Bahia?" — o cadastro aceitava qualquer cidade com
// qualquer UF e não havia como corrigir). Só o administrador; a cidade tem de ser um município da UF (IBGE) e vai com o nome
// oficial — a mesma conferência do cadastro.
export async function updateUserLocationImpl(userId: string, uf: string, cidade: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new ActionError("Corretor inválido.");
  if (typeof uf !== "string" || typeof cidade !== "string") throw new ActionError("Informe a UF e a cidade.");
  const sigla = uf.trim().toUpperCase();
  const cidadeOficial = municipioDaUf(sigla, cidade);
  if (!cidadeOficial) throw new ActionError(`Escolha a cidade na lista de municípios de ${sigla}.`);
  const [updated] = await db.update(users).set({ city: cidadeOficial, state: sigla, updatedAt: new Date() })
    .where(eq(users.id, userId)).returning({ id: users.id, city: users.city, state: users.state });
  if (!updated) throw new ActionError("Corretor não encontrado.");
  revalidatePath("/");
  return updated;
}

// Visualização da Administração (15/10/2026): a pessoa vê a aba Corretores e pagamentos em modo leitura; aprovar,
// suspender, isentar, confirmar e estornar continuam só do administrador. Só o administrador liga ou desliga — nunca
// para si mesmo nem para outro administrador. Grava quem mudou e quando.
export async function setAdminViewAccessImpl(userId: string, ativo: boolean) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new ActionError("Corretor inválido.");
  if (typeof ativo !== "boolean") throw new ActionError("Escolha liberar ou tirar a visualização.");
  if (userId === actor.id) throw new ActionError("Você já é administrador.");
  const [alvo] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!alvo) throw new ActionError("Corretor não encontrado.");
  if (alvo.role === "admin") throw new ActionError("Administrador já vê a Administração inteira.");
  const [salvo] = await db.update(users).set({ adminViewAccess: ativo, adminViewAccessBy: actor.id, adminViewAccessAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ adminViewAccess: users.adminViewAccess, adminViewAccessBy: users.adminViewAccessBy, adminViewAccessAt: users.adminViewAccessAt });
  return salvo;
}

// Conta sem cobrança (sócios, cortesia): ativa, sem vencimento e sem mensalidade; grava quem isentou e quando.
export async function exemptUserFromBillingImpl(userId: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new ActionError("Corretor inválido.");
  const exemptAt = new Date();
  await db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id, billingExemptAt: users.billingExemptAt }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new ActionError("Corretor não encontrado.");
    if (user.billingExemptAt) throw new ActionError("Esta conta já está sem cobrança.");
    await tx.update(users).set({ subscriptionStatus: "ativo", nextBillingDate: null, monthlyFee: "0.00", billingExemptBy: actor.id, billingExemptAt: exemptAt, updatedAt: exemptAt }).where(eq(users.id, userId));
    await tx.insert(notifications).values({ userId, title: "Sua conta não tem cobrança", message: "A equipe isentou sua conta de mensalidade. O acesso continua sem vencimento.", type: "sistema", read: false });
  });
  revalidatePath("/");
  return { success: true, exemptBy: actor.id, exemptAt };
}

export async function confirmPixSubscriptionPaymentImpl(transactionId: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
    throw new ActionError("Transação inválida.");
  }

  const payment = await db.transaction(async (tx) => {
    const [pending] = await tx.select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
    }).from(transactions).where(eq(transactions.id, transactionId)).for("update").limit(1);
    if (!pending) throw new ActionError("Transação não encontrada.");
    if (!pending.type.startsWith("mensalidade_") || pending.paymentMethod !== "pix") {
      throw new ActionError("Apenas mensalidades via Pix podem ser confirmadas nesta tela.");
    }
    if (pending.status !== "pendente") throw new ActionError("Esta transação não está pendente.");

    const [subscriber] = await tx.select().from(users).where(eq(users.id, pending.userId)).for("update").limit(1);
    if (!subscriber) throw new ActionError("Assinante não encontrado.");
    if (subscriber.billingExemptAt) throw new ActionError("Esta conta não tem cobrança: não há Pix a confirmar.");
    const now = new Date();
    const periodEnd = extendPaidPeriod(subscriber.nextBillingDate, subscriber.billingCycle, now);
    let referral: { userId: string; previous: Date | null; end: Date } | null = null;
    if (subscriber.referredBy && !subscriber.referralRewardedAt) {
      const [referrer] = await tx.select().from(users).where(eq(users.id, subscriber.referredBy)).for("update").limit(1);
      if (referrer && referrer.verificationStatus !== "suspenso") {
        const start = referrer.nextBillingDate && referrer.nextBillingDate > now ? referrer.nextBillingDate : now;
        referral = { userId: referrer.id, previous: referrer.nextBillingDate, end: addFreeDays(start) };
        await tx.update(users).set({ nextBillingDate: referral.end, subscriptionStatus: referrer.subscriptionStatus === "teste" ? "teste" : "ativo", updatedAt: now }).where(eq(users.id, referrer.id));
        await tx.update(users).set({ referralRewardedAt: now }).where(eq(users.id, subscriber.id));
        await tx.insert(notifications).values({ userId: referrer.id, title: "Você ganhou 30 dias grátis!", message: "O primeiro pagamento de um corretor indicado foi confirmado. Adicionamos 30 dias ao seu acesso.", type: "sistema", read: false });
      }
    }
    // Guarda o estado anterior: o estorno desfaz exatamente esta confirmação.
    const [confirmed] = await tx.update(transactions)
      .set({
        status: "pago", confirmedBy: actor.id, confirmedAt: now,
        previousBillingDate: subscriber.nextBillingDate, previousSubscriptionStatus: subscriber.subscriptionStatus, periodEnd,
        referralRewardedUserId: referral?.userId ?? null, referralPreviousBillingDate: referral?.previous ?? null, referralPeriodEnd: referral?.end ?? null,
      })
      .where(and(eq(transactions.id, pending.id), eq(transactions.status, "pendente")))
      .returning({ id: transactions.id, userId: transactions.userId, amount: transactions.amount, confirmedAt: transactions.confirmedAt });
    if (!confirmed) throw new ActionError("A transação já foi atualizada.");
    await tx.update(users).set({ subscriptionStatus: "ativo", nextBillingDate: periodEnd, updatedAt: now }).where(eq(users.id, pending.userId));
    await tx.insert(notifications).values({
      userId: pending.userId,
      title: "Pagamento Pix confirmado",
      message: subscriber.verificationStatus === "aprovado"
        ? `A equipe confirmou o recebimento do Pix. Seu acesso vai até ${periodEnd.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
        : "A equipe confirmou o recebimento do Pix. O uso da rede é liberado assim que o CRECI for aprovado.",
      type: "sistema",
      read: false,
    });
    return confirmed;
  });

  revalidatePath("/");
  return { success: true, payment };
}

export async function refundPixSubscriptionPaymentImpl(transactionId: string, reason: string) {
  const actor = await requireCurrentUser();
  if (actor.role !== "admin") throw new ActionError("Ação restrita à administração.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) throw new ActionError("Transação inválida.");
  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (cleanReason.length < 5 || cleanReason.length > 300) throw new ActionError("Informe o motivo do estorno (5 a 300 caracteres).");

  const refunded = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).for("update").limit(1);
    if (!payment) throw new ActionError("Transação não encontrada.");
    if (payment.status !== "pago" || !payment.type.startsWith("mensalidade_") || payment.paymentMethod !== "pix") throw new ActionError("Só mensalidades Pix confirmadas podem ser estornadas.");
    const [subscriber] = await tx.select().from(users).where(eq(users.id, payment.userId)).for("update").limit(1);
    if (!subscriber) throw new ActionError("Assinante não encontrado.");
    // Conta sem cobrança: o estorno só registra a devolução; o acesso não depende de pagamento.
    const exempt = !!subscriber.billingExemptAt;
    if (!exempt) {
      if (!payment.confirmedAt || !payment.periodEnd) throw new ActionError("Este Pix foi confirmado antes do registro de estorno. Ajuste o acesso do corretor manualmente.");
      if (subscriber.nextBillingDate?.getTime() !== payment.periodEnd.getTime()) {
        throw new ActionError("Houve outra renovação depois deste pagamento. Estorne primeiro o pagamento mais recente.");
      }
    }
    const now = new Date();
    await tx.update(users).set({
      ...(exempt ? {} : { nextBillingDate: payment.previousBillingDate, subscriptionStatus: payment.previousSubscriptionStatus || "pendente" }),
      ...(payment.referralRewardedUserId ? { referralRewardedAt: null } : {}),
      updatedAt: now,
    }).where(eq(users.id, subscriber.id));
    if (payment.referralRewardedUserId) {
      const [referrer] = await tx.select().from(users).where(eq(users.id, payment.referralRewardedUserId)).for("update").limit(1);
      if (referrer?.nextBillingDate) {
        // Sem renovação do indicador depois do bônus, volta à data exata; senão, tira os 30 dias concedidos.
        const restored = payment.referralPeriodEnd && referrer.nextBillingDate.getTime() === payment.referralPeriodEnd.getTime()
          ? payment.referralPreviousBillingDate
          : addFreeDays(referrer.nextBillingDate, -30);
        await tx.update(users).set({ nextBillingDate: restored, updatedAt: now }).where(eq(users.id, referrer.id));
        await tx.insert(notifications).values({ userId: referrer.id, title: "Bônus de indicação estornado", message: "O pagamento do corretor indicado foi estornado; os 30 dias de bônus foram retirados.", type: "sistema", read: false });
      }
    }
    const [updated] = await tx.update(transactions)
      .set({ status: "estornado", refundedBy: actor.id, refundedAt: now, refundReason: cleanReason })
      .where(and(eq(transactions.id, payment.id), eq(transactions.status, "pago")))
      .returning({ id: transactions.id, userId: transactions.userId, status: transactions.status });
    if (!updated) throw new ActionError("A transação já foi atualizada.");
    await tx.insert(notifications).values({ userId: subscriber.id, title: "Pagamento estornado", message: `O pagamento Pix foi estornado pela equipe. Motivo: ${cleanReason}`, type: "sistema", read: false });
    return exempt
      ? { ...updated, nextBillingDate: subscriber.nextBillingDate, subscriptionStatus: subscriber.subscriptionStatus }
      : { ...updated, nextBillingDate: payment.previousBillingDate, subscriptionStatus: payment.previousSubscriptionStatus || "pendente" };
  });
  revalidatePath("/");
  return { success: true, payment: refunded };
}
