import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIDE = 2200;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

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

export function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Sube las hojas de un estudio al Storage y las registra en document_files, en orden. */
export async function uploadPages(
  supabase: SupabaseClient,
  params: { familyId: string; documentId: string; files: File[]; startPosition?: number },
) {
  const start = params.startPosition ?? 0;
  for (const [i, original] of params.files.entries()) {
    let file: File;
    if (isPdf(original)) {
      if (original.size > MAX_PDF_BYTES) throw new Error(`"${original.name}" supera los 20 MB`);
      file = new File([original], original.name, { type: "application/pdf" });
    } else {
      try {
        file = await compressImage(original);
      } catch {
        throw new Error(`No se pudo leer "${original.name}". Probá con una foto JPG o una captura de pantalla.`);
      }
    }

    const path = `${params.familyId}/${params.documentId}/${crypto.randomUUID()}.${isPdf(file) ? "pdf" : "jpg"}`;
    const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file, { contentType: file.type });
    if (uploadError) throw new Error("No se pudo subir el archivo: " + uploadError.message);

    const { error: insertError } = await supabase.from("document_files").insert({
      family_id: params.familyId,
      document_id: params.documentId,
      position: start + i,
      storage_path: path,
      file_name: original.name,
      mime_type: file.type,
      file_size: file.size,
    });
    if (insertError) throw new Error("No se pudo registrar la hoja: " + insertError.message);
  }
}

export async function requestAnalysis(documentId: string) {
  const res = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "La IA no pudo analizar el documento");
  }
}
