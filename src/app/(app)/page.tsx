import Link from "next/link";
import { DocumentList } from "@/components/document-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { age, fullName } from "@/lib/labels";
import type { MedicalDocument, Person } from "@/lib/types";

export default async function HomePage() {
  const { supabase, family } = await requireFamily();

  const [{ data: persons }, { data: documents }, { data: visits }] = await Promise.all([
    supabase.from("persons").select("*").eq("family_id", family.id).order("birth_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("documents")
      .select("id, title, file_name, category, study_date, status, person_id, findings, institution")
      .eq("family_id", family.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("visits").select("person_id").eq("family_id", family.id),
  ]);

  const people = (persons ?? []) as Person[];
  const personNames = Object.fromEntries(people.map((p) => [p.id, p.first_name]));
  const visitCount = (visits ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.person_id] = (acc[v.person_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader title={family.name} subtitle="Elegí a un integrante para ver su historia clínica." />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Integrantes</h2>
          <Link href="/integrantes/nuevo" className="btn-secondary">
            + Agregar
          </Link>
        </div>
        {people.length === 0 ? (
          <EmptyState title="Todavía no cargaste a nadie">
            Empezá agregando a cada integrante de la familia.{" "}
            <Link href="/integrantes/nuevo" className="font-medium text-brand-700 underline">
              Agregar el primero
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => {
              const years = age(p.birth_date);
              return (
                <Link key={p.id} href={`/integrantes/${p.id}`} className="card flex items-center gap-3 transition hover:border-brand-500">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                    {p.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{fullName(p)}</p>
                    <p className="text-sm text-slate-500">
                      {years !== null ? `${years} años` : "Edad sin cargar"}
                      {visitCount[p.id] ? ` · ${visitCount[p.id]} visitas` : ""}
                    </p>
                    {p.allergies && <p className="mt-0.5 truncate text-xs text-red-600">Alergias: {p.allergies}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos estudios cargados</h2>
          <Link href="/estudios" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>
        {documents && documents.length > 0 ? (
          <DocumentList documents={documents as MedicalDocument[]} personNames={personNames} />
        ) : (
          <EmptyState title="No hay estudios cargados">
            Sacale una foto a un análisis o subí un PDF y la IA lo ordena por vos.{" "}
            <Link href="/subir" className="font-medium text-brand-700 underline">
              Subir el primero
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}
