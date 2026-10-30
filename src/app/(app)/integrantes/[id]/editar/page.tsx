import { notFound } from "next/navigation";
import { deletePerson } from "@/app/actions";
import { ConfirmButton } from "@/components/buttons";
import { PersonForm } from "@/components/person-form";
import { PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import type { Person } from "@/lib/types";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireFamily();
  const { data: person } = await supabase.from("persons").select("*").eq("id", id).maybeSingle();
  if (!person) notFound();

  return (
    <>
      <PageHeader
        title={`Editar a ${person.first_name}`}
        back={{ href: `/integrantes/${id}`, label: "Volver" }}
        actions={
          <ConfirmButton
            action={deletePerson.bind(null, id)}
            message="Se va a borrar el integrante con todo su historial y visitas. Los estudios quedan sin asignar. ¿Seguro?"
          >
            Borrar integrante
          </ConfirmButton>
        }
      />
      <PersonForm person={person as Person} />
    </>
  );
}
