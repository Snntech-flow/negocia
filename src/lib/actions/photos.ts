"use server";

import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { ActionError, runAction } from "../action-result";
import { requireActiveBroker, requireCurrentUser } from "../auth";
import { authLoginAttempts, db } from "../db";
import { DAILY_PHOTO_UPLOADS, detectImageType, hasCameraMetadata, MAX_PHOTO_BYTES, photoStorageConfig, storePhoto } from "../photo-upload";

async function getPhotoUploadStatusImpl() {
  await requireCurrentUser();
  return { enabled: !!photoStorageConfig() };
}

async function uploadPropertyPhotoImpl(formData: FormData) {
  const actor = await requireCurrentUser();
  requireActiveBroker(actor);
  const config = photoStorageConfig();
  if (!config) throw new ActionError("O envio de fotos ainda não foi ativado pela equipe. Enquanto isso, cole o link da foto.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ActionError("Escolha uma foto.");
  if (file.size > MAX_PHOTO_BYTES) throw new ActionError("A foto precisa ter até 3 MB.");

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const keyHash = crypto.createHash("sha256").update(`photo-upload:${actor.id}:${day}`).digest("hex");
  const [counter] = await db.insert(authLoginAttempts).values({ keyHash, attempts: 1, updatedAt: new Date() })
    .onConflictDoUpdate({ target: authLoginAttempts.keyHash, set: { attempts: sql`${authLoginAttempts.attempts} + 1`, updatedAt: new Date() } })
    .returning({ attempts: authLoginAttempts.attempts });
  if (counter.attempts > DAILY_PHOTO_UPLOADS) throw new ActionError(`Você atingiu o limite de ${DAILY_PHOTO_UPLOADS} fotos por dia. Continue amanhã.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ActionError("Envie a foto em JPG, PNG ou WebP.");
  if (hasCameraMetadata(bytes, type)) throw new ActionError("A foto ainda tem dados de câmera e localização. Envie pelo botão de fotos do NegociaLar, que remove esses dados.");
  try {
    return { url: await storePhoto(bytes, type, actor.id, config) };
  } catch {
    console.error("Falha ao gravar foto no Storage.");
    throw new ActionError("Não foi possível guardar a foto agora. Tente de novo em instantes.");
  }
}

export async function getPhotoUploadStatus(...args: Parameters<typeof getPhotoUploadStatusImpl>) { return runAction(() => getPhotoUploadStatusImpl(...args)); }
export async function uploadPropertyPhoto(...args: Parameters<typeof uploadPropertyPhotoImpl>) { return runAction(() => uploadPropertyPhotoImpl(...args)); }
