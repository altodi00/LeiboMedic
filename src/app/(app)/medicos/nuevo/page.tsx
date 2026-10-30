import { DoctorForm } from "@/components/doctor-form";
import { PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import type { Person } from "@/lib/types";

export default async function NewDoctorPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { persona } = await searchParams;
  const { supabase, family } = await requireFamily();
  const { data: persons } = await supabase.from("persons").select("*").eq("family_id", family.id).order("first_name");
  return (
    <>
      <PageHeader title="Nuevo médico" back={{ href: "/medicos", label: "Médicos" }} />
      <DoctorForm persons={(persons ?? []) as Person[]} linkedPersonIds={persona ? [persona] : []} />
    </>
  );
}
