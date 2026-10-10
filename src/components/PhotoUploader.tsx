"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { getPhotoUploadStatus, uploadPropertyPhoto } from "@/lib/actions/photos";
import { unwrap } from "@/lib/action-result";

const MAX_SIDE = 1600;

// Reduz e regrava em JPEG no navegador: a foto fica leve e perde os dados de câmera (inclusive a localização).
async function prepare(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Não foi possível preparar a foto.");
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export default function PhotoUploader({ remaining, onUploaded, label = "Enviar fotos" }: { remaining: number; onUploaded: (urls: string[]) => void; label?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getPhotoUploadStatus().then((result) => { if (active) setEnabled(unwrap(result).enabled); }).catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, []);

  async function send(files: FileList | null) {
    if (!files?.length || busy) return;
    const chosen = Array.from(files).slice(0, Math.max(0, remaining));
    if (!chosen.length) { setError("Limite de fotos atingido."); return; }
    setBusy(true); setError("");
    const urls: string[] = [];
    try {
      for (const [index, file] of chosen.entries()) {
        setStatus(`Enviando foto ${index + 1} de ${chosen.length}…`);
        let prepared: File;
        try { prepared = await prepare(file); } catch { throw new Error(`Não foi possível abrir "${file.name}". Envie em JPG ou PNG.`); }
        const data = new FormData();
        data.append("file", prepared);
        urls.push(unwrap(await uploadPropertyPhoto(data)).url);
      }
      setStatus(chosen.length === 1 ? "Foto enviada." : `${chosen.length} fotos enviadas.`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Não foi possível enviar a foto.");
      setStatus("");
    } finally {
      if (urls.length) onUploaded(urls);
      setBusy(false);
    }
  }

  if (enabled === false) return <p className="text-[11px] text-slate-500">O envio direto de fotos ainda não foi ativado. Cole o link (URL HTTPS) de cada foto.</p>;
  return <div className="space-y-1">
    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-500 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 ${busy || enabled === null || remaining <= 0 ? "pointer-events-none opacity-50" : ""}`}>
      <ImagePlus className="h-4 w-4" />{busy ? "Enviando…" : label}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" disabled={busy || !enabled || remaining <= 0} onChange={(event) => { void send(event.target.files); event.currentTarget.value = ""; }} />
    </label>
    {status && <p role="status" className="text-[11px] text-emerald-700">{status}</p>}
    {error && <p role="alert" className="text-[11px] text-red-700">{error}</p>}
  </div>;
}
