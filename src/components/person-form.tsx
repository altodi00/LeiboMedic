import { savePerson } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { Field, Select } from "@/components/ui";
import type { Person } from "@/lib/types";

export function PersonForm({ person }: { person?: Person }) {
  return (
    <form action={savePerson} className="card space-y-5">
      {person && <input type="hidden" name="id" value={person.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="first_name" defaultValue={person?.first_name} required />
        <Field label="Apellido" name="last_name" defaultValue={person?.last_name} />
        <Field label="Fecha de nacimiento" name="birth_date" type="date" defaultValue={person?.birth_date} />
        <Select
          label="Sexo"
          name="sex"
          defaultValue={person?.sex}
          emptyLabel="—"
          options={[
            { value: "F", label: "Femenino" },
            { value: "M", label: "Masculino" },
            { value: "X", label: "Otro / X" },
          ]}
        />
        <Field label="DNI" name="national_id" defaultValue={person?.national_id} />
        <Select
          label="Grupo sanguíneo"
          name="blood_type"
          defaultValue={person?.blood_type}
          emptyLabel="No sé"
          options={["0+", "0-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((v) => ({ value: v, label: v }))}
        />
        <Field label="Obra social / prepaga" name="health_insurance" defaultValue={person?.health_insurance} placeholder="Ej: OSDE 310" />
        <Field label="N° de afiliado" name="insurance_number" defaultValue={person?.insurance_number} />
      </div>
      <Field label="Alergias" name="allergies" defaultValue={person?.allergies} placeholder="Ej: Penicilina" textarea />
      <Field label="Enfermedades crónicas / condiciones" name="chronic_conditions" defaultValue={person?.chronic_conditions} textarea />
      <Field label="Medicación habitual" name="medications" defaultValue={person?.medications} placeholder="Ej: Levotiroxina 50 mcg, 1 por día" textarea />
      <Field label="Notas" name="notes" defaultValue={person?.notes} textarea />
      <SubmitButton>{person ? "Guardar cambios" : "Agregar integrante"}</SubmitButton>
    </form>
  );
}
