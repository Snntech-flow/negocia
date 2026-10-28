// Assinatura do próprio corretor: consulta e pedido de renovação via Pix. Movido de actions.ts (Fase 0) — idêntico.
import { ActionError } from "../action-result";
import { db, users, transactions } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "../auth";
import { isPlanId, planCharge, planMonthlyEquivalent, planName, type BillingCycle } from "../plans";

export async function getMySubscriptionImpl() {
  const actor = await requireCurrentUser();
  const [user] = await db.select({ id: users.id, plan: users.plan, status: users.subscriptionStatus, expiresAt: users.nextBillingDate, billingCycle: users.billingCycle, priceTable: users.priceTable, exemptAt: users.billingExemptAt }).from(users).where(eq(users.id, actor.id)).limit(1);
  const payments = await db.select({ id: transactions.id, amount: transactions.amount, status: transactions.status, type: transactions.type, paymentMethod: transactions.paymentMethod, description: transactions.description, createdAt: transactions.createdAt }).from(transactions).where(eq(transactions.userId, actor.id)).orderBy(desc(transactions.createdAt));
  return { user, payments };
}

export async function requestSubscriptionRenewalImpl(chosenCycle?: string) {
  const actor = await requireCurrentUser();
  const payment = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, actor.id)).for("update").limit(1);
    if (user?.billingExemptAt) throw new ActionError("Sua conta não tem cobrança.");
    if (!user || !isPlanId(user.plan)) throw new ActionError("Consulte a equipe para renovar este plano.");
    const [existing] = await tx.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.userId, actor.id), eq(transactions.status, "pendente"), eq(transactions.paymentMethod, "pix"), eq(transactions.type, "mensalidade_pro"))).limit(1);
    // Primeira cobrança: o corretor escolhe mensal ou anual. Depois do primeiro pagamento, vale o ciclo escolhido.
    let cycle: BillingCycle = user.billingCycle === "annual" ? "annual" : "monthly";
    if (existing) {
      if (chosenCycle !== undefined && chosenCycle !== cycle) throw new ActionError("Já há um Pix aguardando a conferência da equipe. Aguarde para mudar entre mensal e anual.");
      return existing;
    }
    if (chosenCycle !== undefined && chosenCycle !== cycle) {
      if (chosenCycle !== "monthly" && chosenCycle !== "annual") throw new ActionError("Escolha mensal ou anual.");
      const [paid] = await tx.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.userId, actor.id), eq(transactions.status, "pago"), sql`${transactions.type} like 'mensalidade\\_%'`)).limit(1);
      if (paid) throw new ActionError(`Sua assinatura é ${cycle === "annual" ? "anual" : "mensal"}: o ciclo é escolhido no primeiro pagamento.`);
      cycle = chosenCycle;
      await tx.update(users).set({ billingCycle: cycle, monthlyFee: planMonthlyEquivalent(user.plan, cycle, user.priceTable), updatedAt: new Date() }).where(eq(users.id, actor.id));
    }
    const [created] = await tx.insert(transactions).values({ userId: actor.id, amount: planCharge(user.plan, cycle, user.priceTable), type: "mensalidade_pro", paymentMethod: "pix", status: "pendente", description: `Renovação do plano ${planName(user.plan)} (${cycle === "annual" ? "anual" : "mensal"}) — confirmação manual` }).returning({ id: transactions.id });
    return created;
  });
  revalidatePath("/");
  return { success: true, payment };
}
