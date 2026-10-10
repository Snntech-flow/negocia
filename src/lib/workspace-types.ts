// Tipos da área de trabalho tirados da própria consulta: tela e servidor não se desencontram quando uma coluna muda.
import type { getMarketplaceData } from "./queries/marketplace";

export type WorkspaceData = Awaited<ReturnType<typeof getMarketplaceData>>;
export type WorkspaceUser = WorkspaceData["users"][number];
export type WorkspaceCurrentUser = NonNullable<WorkspaceData["currentUser"]>;
// Logo depois de entrar a tela tem só a linha do usuário; a situação de pagamento chega com a consulta seguinte.
export type WorkspaceSessionUser = Omit<WorkspaceCurrentUser, "hasPaid" | "pendingPix"> & Partial<Pick<WorkspaceCurrentUser, "hasPaid" | "pendingPix">>;
export type WorkspaceTransaction = WorkspaceData["transactions"][number];
export type WorkspaceFeedback = WorkspaceData["pilotFeedback"][number];
export type WorkspaceNotification = WorkspaceData["notifications"][number];
