import Link from "next/link";
import { Badge } from "@/components/ui";
import { DOCUMENT_CATEGORIES, formatDate } from "@/lib/labels";
import type { MedicalDocument } from "@/lib/types";

const STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Para completar", className: "bg-slate-50 text-slate-600 ring-slate-200" },
  procesando: { label: "Analizando…", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  error: { label: "Error", className: "bg-red-50 text-red-700 ring-red-200" },
};

export function DocumentList({
  documents,
  personNames,
}: {
  documents: Pick<MedicalDocument, "id" | "title" | "category" | "study_date" | "status" | "person_id" | "findings" | "institution">[];
  personNames?: Record<string, string>;
}) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {documents.map((d) => {
        const outOfRange = (d.findings ?? []).filter((f) => f.flag === "alto" || f.flag === "bajo" || f.flag === "anormal").length;
        return (
          <li key={d.id}>
            <Link href={`/estudios/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{d.title ?? "Documento sin analizar"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>{formatDate(d.study_date)}</span>
                  {d.category && <span>· {DOCUMENT_CATEGORIES[d.category] ?? d.category}</span>}
                  {personNames && d.person_id && personNames[d.person_id] && <span>· {personNames[d.person_id]}</span>}
                  {d.institution && <span className="hidden sm:inline">· {d.institution}</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {d.status !== "listo" && <Badge className={STATUS[d.status].className}>{STATUS[d.status].label}</Badge>}
                {outOfRange > 0 && (
                  <Badge className="bg-amber-50 text-amber-800 ring-amber-200">
                    {outOfRange} fuera de rango
                  </Badge>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
