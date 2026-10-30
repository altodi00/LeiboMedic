"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isPdf, requestAnalysis, uploadPages } from "@/lib/upload";

type Page = { key: string; file: File; preview: string | null };

type Study = {
  key: string;
  pages: Page[];
  state: "armando" | "subiendo" | "analizando" | "listo" | "error";
  message?: string;
  documentId?: string;
};

const STATE_LABEL: Record<Study["state"], string> = {
  armando: "",
  subiendo: "Subiendo…",
  analizando: "La IA está leyendo el estudio…",
  listo: "Listo",
  error: "Error",
};

function toPages(list: FileList | null): Page[] {
  return Array.from(list ?? []).map((file) => ({
    key: crypto.randomUUID(),
    file,
    preview: isPdf(file) ? null : URL.createObjectURL(file),
  }));
}

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
  const [studies, setStudies] = useState<Study[]>([]);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  // Estudio al que se agregan las próximas hojas elegidas (null = estudio nuevo).
  const targetRef = useRef<string | null>(null);

  const update = (key: string, patch: Partial<Study>) => setStudies((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  function pick(kind: "camera" | "files", target: string | null) {
    targetRef.current = target;
    (kind === "camera" ? cameraRef : filesRef).current?.click();
  }

  function onPicked(list: FileList | null) {
    const pages = toPages(list);
    if (pages.length === 0) return;
    const target = targetRef.current;
    setStudies((prev) =>
      target && prev.some((s) => s.key === target)
        ? prev.map((s) => (s.key === target ? { ...s, pages: [...s.pages, ...pages] } : s))
        : [...prev, { key: crypto.randomUUID(), pages, state: "armando" }],
    );
  }

  function removePage(studyKey: string, pageKey: string) {
    setStudies((prev) =>
      prev
        .map((s) => (s.key === studyKey ? { ...s, pages: s.pages.filter((p) => p.key !== pageKey) } : s))
        .filter((s) => s.pages.length > 0),
    );
  }

  function movePage(studyKey: string, index: number, delta: number) {
    setStudies((prev) =>
      prev.map((s) => {
        if (s.key !== studyKey) return s;
        const pages = [...s.pages];
        const j = index + delta;
        if (j < 0 || j >= pages.length) return s;
        [pages[index], pages[j]] = [pages[j], pages[index]];
        return { ...s, pages };
      }),
    );
  }

  /** Saca una hoja de un estudio y la convierte en un estudio aparte. */
  function splitPage(studyKey: string, pageKey: string) {
    setStudies((prev) => {
      const out: Study[] = [];
      for (const s of prev) {
        if (s.key !== studyKey) {
          out.push(s);
          continue;
        }
        const page = s.pages.find((p) => p.key === pageKey)!;
        out.push({ ...s, pages: s.pages.filter((p) => p.key !== pageKey) });
        out.push({ key: crypto.randomUUID(), pages: [page], state: "armando" });
      }
      return out;
    });
  }

  async function processOne(study: Study) {
    const supabase = createClient();
    try {
      update(study.key, { state: "subiendo", message: undefined });
      const { data: doc, error } = await supabase
        .from("documents")
        .insert({ family_id: familyId, person_id: personId || null })
        .select("id")
        .single();
      if (error || !doc) throw new Error("No se pudo registrar el estudio");
      update(study.key, { documentId: doc.id });

      await uploadPages(supabase, { familyId, documentId: doc.id, files: study.pages.map((p) => p.file) });

      update(study.key, { state: "analizando" });
      await requestAnalysis(doc.id);
      update(study.key, { state: "listo" });
    } catch (error) {
      update(study.key, { state: "error", message: error instanceof Error ? error.message : "Error inesperado" });
    }
  }

  async function processAll() {
    setBusy(true);
    for (const study of studies.filter((s) => s.state === "armando")) {
      await processOne(study);
    }
    setBusy(false);
  }

  const pending = studies.filter((s) => s.state === "armando").length;

  return (
    <div className="space-y-5">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onPicked(e.target.files);
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
          onPicked(e.target.files);
          e.target.value = "";
        }}
      />

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
          <button type="button" onClick={() => pick("camera", null)} disabled={busy} className="btn-secondary py-6 text-base">
            📷 Nuevo estudio con foto
          </button>
          <button type="button" onClick={() => pick("files", null)} disabled={busy} className="btn-secondary py-6 text-base">
            📄 Nuevo estudio desde archivos
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Si el estudio tiene varias hojas, sacale foto a la primera y después tocá <strong>“Agregar hoja”</strong> para sumar las demás al mismo
          estudio. Si elegís varios archivos juntos, quedan como hojas de un mismo estudio; con “Separar” podés pasar una hoja a un estudio aparte.
        </p>
      </div>

      {studies.map((study, n) => {
        const editable = study.state === "armando" && !busy;
        return (
          <div key={study.key} className="card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Estudio {n + 1}{" "}
                <span className="font-normal text-slate-500">
                  · {study.pages.length} {study.pages.length === 1 ? "hoja" : "hojas"}
                </span>
              </h3>
              <div className="flex items-center gap-2 text-sm">
                {(study.state === "subiendo" || study.state === "analizando") && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                )}
                <span className={study.state === "error" ? "text-red-600" : study.state === "listo" ? "text-emerald-600" : "text-slate-500"}>
                  {study.state === "error" ? study.message : STATE_LABEL[study.state]}
                </span>
                {study.documentId && (study.state === "listo" || study.state === "error") && (
                  <Link href={`/estudios/${study.documentId}`} className="font-medium text-brand-700 hover:underline">
                    Ver
                  </Link>
                )}
              </div>
            </div>

            <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {study.pages.map((page, i) => (
                <li key={page.key} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {page.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.preview} alt={`Hoja ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center p-2 text-center text-xs text-slate-500">
                      <span className="text-2xl">📄</span>
                      <span className="mt-1 line-clamp-2 break-all">{page.file.name}</span>
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs font-medium text-white">{i + 1}</span>
                  {editable && (
                    <>
                      <button
                        type="button"
                        onClick={() => removePage(study.key, page.key)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                        aria-label="Quitar hoja"
                      >
                        ✕
                      </button>
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 text-xs text-white">
                        <button type="button" onClick={() => movePage(study.key, i, -1)} disabled={i === 0} className="px-2 py-1 disabled:opacity-30" aria-label="Mover antes">
                          ←
                        </button>
                        {study.pages.length > 1 && (
                          <button type="button" onClick={() => splitPage(study.key, page.key)} className="px-1 py-1">
                            Separar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => movePage(study.key, i, 1)}
                          disabled={i === study.pages.length - 1}
                          className="px-2 py-1 disabled:opacity-30"
                          aria-label="Mover después"
                        >
                          →
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>

            {editable && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => pick("camera", study.key)} className="btn-secondary">
                  📷 Agregar hoja (foto)
                </button>
                <button type="button" onClick={() => pick("files", study.key)} className="btn-secondary">
                  📄 Agregar hoja (archivo)
                </button>
              </div>
            )}
          </div>
        );
      })}

      {pending > 0 && (
        <button type="button" onClick={processAll} disabled={busy} className="btn-primary w-full py-3 text-base">
          {busy ? "Procesando…" : `Subir y analizar ${pending} ${pending === 1 ? "estudio" : "estudios"}`}
        </button>
      )}
    </div>
  );
}
