import Link from "next/link";
import { DocumentList } from "@/components/document-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { DOCUMENT_CATEGORIES } from "@/lib/labels";
import type { MedicalDocument } from "@/lib/types";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; categoria?: string; q?: string }>;
}) {
  const { persona, categoria, q } = await searchParams;
  const { supabase, family } = await requireFamily();

  let query = supabase
    .from("documents")
    .select("id, title, category, study_date, status, person_id, findings, institution")
    .eq("family_id", family.id)
    .order("study_date", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (persona) query = query.eq("person_id", persona);
  if (categoria) query = query.eq("category", categoria);
  if (q) {
    const term = q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,institution.ilike.%${term}%,detected_doctor.ilike.%${term}%`);
  }

  const [{ data: documents }, { data: persons }] = await Promise.all([
    query,
    supabase.from("persons").select("id, first_name").eq("family_id", family.id).order("first_name"),
  ]);
  const names = Object.fromEntries((persons ?? []).map((p) => [p.id, p.first_name]));

  return (
    <>
      <PageHeader
        title="Estudios y documentos"
        actions={
          <Link href="/subir" className="btn-primary">
            + Subir estudio
          </Link>
        }
      />
      <form className="mb-4 grid gap-2 sm:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Buscar (ej: hemograma, Dr. Pérez)" className="input sm:col-span-2" />
        <select name="persona" defaultValue={persona ?? ""} className="input">
          <option value="">Todos los integrantes</option>
          {(persons ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={categoria ?? ""} className="input">
          <option value="">Todos los tipos</option>
          {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn-secondary sm:col-span-4 sm:justify-self-start">Filtrar</button>
      </form>
      {documents && documents.length > 0 ? (
        <DocumentList documents={documents as MedicalDocument[]} personNames={names} />
      ) : (
        <EmptyState title="No se encontraron estudios" />
      )}
    </>
  );
}
