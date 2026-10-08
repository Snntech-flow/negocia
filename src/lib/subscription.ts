export const TRIAL_DAYS = 30;
export function addFreeDays(from: Date, days = TRIAL_DAYS) {
  return new Date(from.getTime() + days * 86400000);
}
export function extendPaidPeriod(expiresAt: Date | null, cycle: string, now = new Date()) {
  const start = expiresAt && expiresAt > now ? new Date(expiresAt) : new Date(now);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() + (cycle === "annual" ? 12 : 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return start;
}
export function hasSubscriptionAccess(status: string, expiresAt: Date | null, now = new Date()) {
  if (status === "teste") return !!expiresAt && expiresAt > now;
  return status === "ativo" && (!expiresAt || expiresAt > now);
}
