import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { doctorName } from "@/lib/labels";
import type { Doctor } from "@/lib/types";

export default async function DoctorsPage() {
  const { supabase, family } = await requireFamily();
  const [{ data: doctorRows }, { data: links }, { data: persons }] = await Promise.all([
    supabase.from("doctors").select("*").eq("family_id", family.id).order("specialty").order("last_name"),
    supabase.from("person_doctors").select("person_id, doctor_id").eq("family_id", family.id),
    supabase.from("persons").select("id, first_name").eq("family_id", family.id),
  ]);
  const doctors = (doctorRows ?? []) as Doctor[];
  const names = Object.fromEntries((persons ?? []).map((p) => [p.id, p.first_name]));
  const patientsOf = (doctorId: string) =>
    (links ?? []).filter((l) => l.doctor_id === doctorId).map((l) => names[l.person_id]).filter(Boolean);

  return (
    <>
      <PageHeader
        title="Médicos"
        subtitle="Todos los profesionales que atienden a la familia."
        actions={
          <Link href="/medicos/nuevo" className="btn-primary">
            + Agregar médico
          </Link>
        }
      />
      {doctors.length === 0 ? (
        <EmptyState title="No hay médicos cargados">
          Agregalos a mano, o subí un estudio: si la IA detecta al médico, lo podés crear con un clic.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {doctors.map((d) => (
            <Link key={d.id} href={`/medicos/${d.id}`} className="card block transition hover:border-brand-500">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{d.specialty ?? "Sin especialidad"}</p>
              <p className="mt-0.5 font-semibold">{doctorName(d)}</p>
              <p className="mt-1 text-sm text-slate-500">{[d.phone, d.institution].filter(Boolean).join(" · ")}</p>
              {patientsOf(d.id).length > 0 && <p className="mt-1 text-xs text-slate-500">Atiende a: {patientsOf(d.id).join(", ")}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
