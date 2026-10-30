"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";

const EMPTY: Finding = { name: "", value: "", unit: null, reference: null, flag: "sin_referencia" };

/** Tabla editable de valores (ej. hemograma). Se envía como JSON en el campo "findings". */
export function FindingsEditor({ initial }: { initial: Finding[] }) {
  const [rows, setRows] = useState<Finding[]>(initial.length ? initial : []);
  const set = (i: number, patch: Partial<Finding>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const clean = rows.filter((r) => r.name.trim() && r.value.trim());

  return (
    <div>
      <span className="label">Valores (opcional)</span>
      <input type="hidden" name="findings" value={JSON.stringify(clean)} />
      {rows.length === 0 && <p className="mb-2 text-sm text-slate-500">Para análisis de laboratorio: cargá cada determinación con su resultado.</p>}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-12">
            <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Ej: Glucemia" className="input col-span-2 sm:col-span-4" />
            <input value={r.value} onChange={(e) => set(i, { value: e.target.value })} placeholder="Resultado" className="input sm:col-span-2" />
            <input value={r.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value || null })} placeholder="Unidad" className="input sm:col-span-2" />
            <input
              value={r.reference ?? ""}
              onChange={(e) => set(i, { reference: e.target.value || null })}
              placeholder="Referencia"
              className="input col-span-2 sm:col-span-2"
            />
            <select value={r.flag} onChange={(e) => set(i, { flag: e.target.value as Finding["flag"] })} className="input sm:col-span-1 sm:px-1">
              <option value="sin_referencia">—</option>
              <option value="normal">Normal</option>
              <option value="alto">Alto</option>
              <option value="bajo">Bajo</option>
              <option value="anormal">Anormal</option>
            </select>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              className="text-sm text-slate-400 hover:text-red-600 sm:col-span-1"
              aria-label="Quitar valor"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows((prev) => [...prev, { ...EMPTY }])} className="btn-secondary mt-2">
        + Agregar valor
      </button>
    </div>
  );
}
