import { notFound } from "next/navigation";
import { deleteDoctor } from "@/app/actions";
import { ConfirmButton } from "@/components/buttons";
import { DoctorForm } from "@/components/doctor-form";
import { PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import type { Doctor, Person } from "@/lib/types";

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family } = await requireFamily();
  const [{ data: doctor }, { data: persons }, { data: links }] = await Promise.all([
    supabase.from("doctors").select("*").eq("id", id).maybeSingle(),
    supabase.from("persons").select("*").eq("family_id", family.id).order("first_name"),
    supabase.from("person_doctors").select("person_id").eq("doctor_id", id),
  ]);
  if (!doctor) notFound();

  return (
    <>
      <PageHeader
        title="Editar médico"
        back={{ href: `/medicos/${id}`, label: "Volver" }}
        actions={
          <ConfirmButton action={deleteDoctor.bind(null, id)} message="Se va a borrar el médico. Sus visitas quedan registradas sin médico. ¿Seguro?">
            Borrar médico
          </ConfirmButton>
        }
      />
      <DoctorForm doctor={doctor as Doctor} persons={(persons ?? []) as Person[]} linkedPersonIds={(links ?? []).map((l) => l.person_id)} />
    </>
  );
}
