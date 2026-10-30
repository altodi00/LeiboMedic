import { PageHeader } from "@/components/ui";
import { Uploader } from "@/components/uploader";
import { requireFamily } from "@/lib/family";
import { fullName } from "@/lib/labels";

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { persona } = await searchParams;
  const { supabase, family } = await requireFamily();
  const { data: persons } = await supabase.from("persons").select("id, first_name, last_name").eq("family_id", family.id).order("first_name");

  return (
    <>
      <PageHeader
        title="Subir estudio"
        subtitle="Sacale una foto o subí el PDF. La IA identifica de qué estudio se trata, de quién es, la fecha, el médico y los valores."
      />
      <Uploader familyId={family.id} persons={(persons ?? []).map((p) => ({ id: p.id, name: fullName(p) }))} defaultPersonId={persona} />
    </>
  );
}
