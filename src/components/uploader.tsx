"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  key: string;
  file: File;
  state: "en_cola" | "subiendo" | "analizando" | "listo" | "error";
  message?: string;
  documentId?: string;
};

const MAX_SIDE = 2200;
const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Achica las fotos del celular (que suelen pesar varios MB) antes de subirlas. */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

const STATE_LABEL: Record<Item["state"], string> = {
  en_cola: "En espera",
  subiendo: "Subiendo…",
  analizando: "La IA está leyendo el documento…",
  listo: "Listo",
  error: "Error",
};

export function Uploader({
  familyId,
  persons,
  defaultPersonId,
}: {
  familyId: string;
  persons: { id: string; name: string }[];
  defaultPersonId?: string;
}) {
  const [personId, setPersonId] = useState(defaultPersonId ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list).map((file) => ({ key: crypto.randomUUID(), file, state: "en_cola" as const }));
    setItems((prev) => [...prev, ...added]);
  }

  async function processOne(item: Item) {
    const supabase = createClient();
    try {
      update(item.key, { state: "subiendo", message: undefined });
      let file = item.file;
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        if (file.size > MAX_PDF_BYTES) throw new Error("El PDF supera los 25 MB");
        file = new File([file], file.name, { type: "application/pdf" });
      } else {
        try {
          file = await compressImage(file);
        } catch {
          throw new Error("No se pudo leer la imagen. Probá con una foto JPG o una captura de pantalla.");
        }
      }

      const ext = isPdf ? "pdf" : "jpg";
      const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file, { contentType: file.type });
      if (uploadError) throw new Error("No se pudo subir el archivo: " + uploadError.message);

      const { data: doc, error: insertError } = await supabase
        .from("documents")
        .insert({
          family_id: familyId,
          person_id: personId || null,
          storage_path: path,
          file_name: item.file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        .select("id")
        .single();
      if (insertError || !doc) throw new Error("No se pudo registrar el documento");

      update(item.key, { state: "analizando", documentId: doc.id });
      const res = await fetch(`/api/documents/${doc.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "La IA no pudo analizar el documento");
      }
      update(item.key, { state: "listo" });
    } catch (error) {
      update(item.key, { state: "error", message: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function processAll() {
    setBusy(true);
    for (const item of items.filter((i) => i.state === "en_cola")) {
      await processOne(item);
    }
    setBusy(false);
  }

  const pending = items.filter((i) => i.state === "en_cola").length;

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <label className="block">
          <span className="label">¿De quién es?</span>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="input" disabled={busy}>
            <option value="">Que la IA lo detecte</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy} className="btn-secondary py-6 text-base">
            📷 Sacar una foto
          </button>
          <button type="button" onClick={() => filesRef.current?.click()} disabled={busy} className="btn-secondary py-6 text-base">
            📄 Elegir fotos o PDF
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={filesRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-slate-500">
          Consejo: sacá la foto con buena luz, de frente y sin cortar los bordes. Cada archivo se guarda como un estudio separado; si un estudio tiene
          varias hojas, lo ideal es subirlo como un único PDF.
        </p>
      </div>

      {items.length > 0 && (
        <div className="card">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className={`text-xs ${item.state === "error" ? "text-red-600" : item.state === "listo" ? "text-emerald-600" : "text-slate-500"}`}>
                    {item.message ?? STATE_LABEL[item.state]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(item.state === "subiendo" || item.state === "analizando") && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  )}
                  {item.documentId && (item.state === "listo" || item.state === "error") && (
                    <Link href={`/estudios/${item.documentId}`} className="text-sm font-medium text-brand-700 hover:underline">
                      Ver
                    </Link>
                  )}
                  {item.state === "en_cola" && !busy && (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                      className="text-sm text-slate-400 hover:text-red-600"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {pending > 0 && (
            <button type="button" onClick={processAll} disabled={busy} className="btn-primary mt-3 w-full py-3 text-base">
              {busy ? "Procesando…" : `Subir y analizar ${pending} ${pending === 1 ? "archivo" : "archivos"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
