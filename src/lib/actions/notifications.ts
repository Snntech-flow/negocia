// Notificações do corretor. Movido de actions.ts (Fase 0) — comportamento idêntico.
import { db, notifications } from "../db";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "../auth";

export async function markNotificationAsReadImpl(notificationId: string) {
  const actor = await requireCurrentUser();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.id)));

  revalidatePath("/");
  return { success: true };
}

export async function markAllNotificationsAsReadImpl() {
  const actor = await requireCurrentUser();
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, actor.id), eq(notifications.read, false)));
  revalidatePath("/");
  return { success: true };
}
