import { and, eq } from "drizzle-orm";
import { properties, buyerProfiles, users } from "./db/schema";

// These predicates require a join to the owner in users.
export function networkPropertyScope() {
  return and(eq(properties.acceptsPartnership, true), eq(properties.status, "disponivel"), eq(users.verificationStatus, "aprovado"));
}

export function networkProfileScope() {
  return and(eq(buyerProfiles.active, true), eq(users.verificationStatus, "aprovado"));
}

export function canUseProperty(property: {
  brokerId: string; acceptsPartnership: boolean; status: string; verificationStatus: string;
}, actorId: string) {
  return property.brokerId === actorId ||
    (property.acceptsPartnership && property.status === "disponivel" && property.verificationStatus === "aprovado");
}
