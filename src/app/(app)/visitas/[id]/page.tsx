import { notFound } from "next/navigation";
import { deleteVisit } from "@/app/actions";
import { ConfirmButton } from "@/components/buttons";
import { PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { requireFamily } from "@/lib/family";
import type { Doctor, Person, Visit } from "@/lib/types";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family } = await requireFamily();
  const [{ data: visit }, { data: persons }, { data: doctors }] = await Promise.all([
    supabase.from("visits").select("*").eq("id", id).maybeSingle(),
    supabase.from("persons").select("*").eq("family_id", family.id).order("first_name"),
    supabase.from("doctors").select("*").eq("family_id", family.id).order("last_name"),
  ]);
  if (!visit) notFound();
  const back = `/integrantes/${visit.person_id}?tab=visitas`;

  return (
    <>
      <PageHeader
        title="Visita médica"
        back={{ href: back, label: "Volver" }}
        actions={<ConfirmButton action={deleteVisit.bind(null, id, back)}>Borrar visita</ConfirmButton>}
      />
      <VisitForm visit={visit as Visit} persons={(persons ?? []) as Person[]} doctors={(doctors ?? []) as Doctor[]} />
    </>
  );
}
