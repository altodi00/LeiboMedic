"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestAnalysis, uploadPages } from "@/lib/upload";

/** Agrega hojas a un estudio ya cargado y lo vuelve a analizar con todas las hojas. */
export function AddPagesButton({ familyId, documentId, nextPosition }: { familyId: string; documentId: string; nextPosition: number }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setError(null);
    try {
      setStatus("Subiendo…");
      await uploadPages(createClient(), { familyId, documentId, files, startPosition: nextPosition });
      setStatus("La IA está releyendo el estudio completo…");
      await requestAnalysis(documentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
    setStatus(null);
    router.refresh();
  }

  const input = (ref: React.RefObject<HTMLInputElement | null>, camera: boolean) => (
    <input
      ref={ref}
      type="file"
      accept={camera ? "image/*" : "image/*,application/pdf"}
      capture={camera ? "environment" : undefined}
      multiple={!camera}
      className="hidden"
      onChange={(e) => {
        add(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return (
    <div>
      {input(cameraRef, true)}
      {input(filesRef, false)}
      {status ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          {status}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary">
            📷 Agregar hoja
          </button>
          <button type="button" onClick={() => filesRef.current?.click()} className="btn-secondary">
            📄 Agregar archivo
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
