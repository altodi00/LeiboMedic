import { saveDoctor } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { Field } from "@/components/ui";
import { fullName } from "@/lib/labels";
import type { Doctor, Person } from "@/lib/types";

export function DoctorForm({ doctor, persons, linkedPersonIds }: { doctor?: Doctor; persons: Person[]; linkedPersonIds: string[] }) {
  return (
    <form action={saveDoctor} className="card space-y-5">
      {doctor && <input type="hidden" name="id" value={doctor.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="first_name" defaultValue={doctor?.first_name} />
        <Field label="Apellido" name="last_name" defaultValue={doctor?.last_name} required />
        <Field label="Especialidad" name="specialty" defaultValue={doctor?.specialty} placeholder="Ej: Pediatría" />
        <Field label="Teléfono" name="phone" type="tel" defaultValue={doctor?.phone} />
        <Field label="Email" name="email" type="email" defaultValue={doctor?.email} />
        <Field label="Clínica / hospital" name="institution" defaultValue={doctor?.institution} />
      </div>
      <Field label="Dirección del consultorio" name="address" defaultValue={doctor?.address} />
      <Field label="Notas" name="notes" defaultValue={doctor?.notes} placeholder="Ej: atiende martes y jueves, pedir turno por WhatsApp" textarea />
      {persons.length > 0 && (
        <fieldset>
          <legend className="label">¿A quién atiende?</legend>
          <div className="flex flex-wrap gap-2">
            {persons.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="checkbox" name="person_ids" value={p.id} defaultChecked={linkedPersonIds.includes(p.id)} className="accent-brand-600" />
                {fullName(p)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <SubmitButton>{doctor ? "Guardar cambios" : "Agregar médico"}</SubmitButton>
    </form>
  );
}
