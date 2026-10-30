import { PersonForm } from "@/components/person-form";
import { PageHeader } from "@/components/ui";

export default function NewPersonPage() {
  return (
    <>
      <PageHeader title="Nuevo integrante" back={{ href: "/", label: "Inicio" }} />
      <PersonForm />
    </>
  );
}
