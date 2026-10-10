// Tipos da área de trabalho tirados da própria consulta: tela e servidor não se desencontram quando uma coluna muda.
import type { getMarketplaceData } from "./queries/marketplace";

export type WorkspaceData = Awaited<ReturnType<typeof getMarketplaceData>>;
export type WorkspaceUser = WorkspaceData["users"][number];
export type WorkspaceTransaction = WorkspaceData["transactions"][number];
export type WorkspaceFeedback = WorkspaceData["pilotFeedback"][number];
export type WorkspaceNotification = WorkspaceData["notifications"][number];
