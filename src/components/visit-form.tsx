import { saveVisit } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { Field, Select } from "@/components/ui";
import { doctorName, fullName } from "@/lib/labels";
import type { Doctor, Person, Visit } from "@/lib/types";

export function VisitForm({
  visit,
  persons,
  doctors,
  defaultPersonId,
  defaultDoctorId,
  returnTo,
}: {
  visit?: Visit;
  persons: Person[];
  doctors: Doctor[];
  defaultPersonId?: string;
  defaultDoctorId?: string;
  returnTo?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={saveVisit} className="card space-y-5">
      {visit && <input type="hidden" name="id" value={visit.id} />}
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Integrante"
          name="person_id"
          required
          defaultValue={visit?.person_id ?? defaultPersonId}
          emptyLabel="Elegí…"
          options={persons.map((p) => ({ value: p.id, label: fullName(p) }))}
        />
        <Select
          label="Médico"
          name="doctor_id"
          defaultValue={visit?.doctor_id ?? defaultDoctorId}
          emptyLabel="Sin especificar"
          options={doctors.map((d) => ({ value: d.id, label: `${doctorName(d)}${d.specialty ? " — " + d.specialty : ""}` }))}
        />
        <Field label="Fecha" name="visit_date" type="date" required defaultValue={visit?.visit_date ?? today} />
        <Field label="Motivo de consulta" name="reason" defaultValue={visit?.reason} placeholder="Ej: control anual" />
      </div>
      <Field label="Diagnóstico" name="diagnosis" defaultValue={visit?.diagnosis} textarea />
      <Field label="Indicaciones / tratamiento" name="indications" defaultValue={visit?.indications} textarea />
      <Field label="Notas" name="notes" defaultValue={visit?.notes} textarea />
      <SubmitButton>{visit ? "Guardar cambios" : "Registrar visita"}</SubmitButton>
    </form>
  );
}
