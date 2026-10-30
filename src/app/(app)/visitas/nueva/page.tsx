import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { requireFamily } from "@/lib/family";
import type { Doctor, Person } from "@/lib/types";

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<{ persona?: string; medico?: string }> }) {
  const { persona, medico } = await searchParams;
  const { supabase, family } = await requireFamily();
  const [{ data: persons }, { data: doctors }] = await Promise.all([
    supabase.from("persons").select("*").eq("family_id", family.id).order("first_name"),
    supabase.from("doctors").select("*").eq("family_id", family.id).order("last_name"),
  ]);
  const back = persona ? `/integrantes/${persona}?tab=visitas` : medico ? `/medicos/${medico}` : "/";

  return (
    <>
      <PageHeader title="Nueva visita médica" back={{ href: back, label: "Volver" }} />
      {!persons?.length ? (
        <EmptyState title="Primero agregá a un integrante">
          <Link href="/integrantes/nuevo" className="text-brand-700 underline">
            Agregar integrante
          </Link>
        </EmptyState>
      ) : (
        <VisitForm
          persons={persons as Person[]}
          doctors={(doctors ?? []) as Doctor[]}
          defaultPersonId={persona}
          defaultDoctorId={medico}
          returnTo={medico && !persona ? `/medicos/${medico}` : undefined}
        />
      )}
    </>
  );
}
