import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentList } from "@/components/document-list";
import { EmptyState, InfoRow, PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { doctorName, formatDate } from "@/lib/labels";
import type { Doctor, MedicalDocument, Visit } from "@/lib/types";

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family } = await requireFamily();
  const { data: row } = await supabase.from("doctors").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const doctor = row as Doctor;

  const [{ data: visitRows }, { data: docs }, { data: persons }, { data: links }] = await Promise.all([
    supabase.from("visits").select("*").eq("doctor_id", id).order("visit_date", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, category, study_date, status, person_id, findings, institution")
      .eq("doctor_id", id)
      .order("study_date", { ascending: false, nullsFirst: false }),
    supabase.from("persons").select("id, first_name, last_name").eq("family_id", family.id),
    supabase.from("person_doctors").select("person_id").eq("doctor_id", id),
  ]);
  const visits = (visitRows ?? []) as Visit[];
  const names = Object.fromEntries((persons ?? []).map((p) => [p.id, p.first_name]));
  const patients = (links ?? []).map((l) => names[l.person_id]).filter(Boolean);
  const mapsUrl = doctor.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.address)}` : null;

  return (
    <>
      <PageHeader
        title={doctorName(doctor)}
        subtitle={doctor.specialty}
        back={{ href: "/medicos", label: "Médicos" }}
        actions={
          <>
            <Link href={`/visitas/nueva?medico=${id}`} className="btn-primary">
              + Visita
            </Link>
            <Link href={`/medicos/${id}/editar`} className="btn-secondary">
              Editar
            </Link>
          </>
        }
      />

      <div className="card mb-6">
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Teléfono" value={doctor.phone && <a href={`tel:${doctor.phone}`} className="text-brand-700 underline">{doctor.phone}</a>} />
          <InfoRow label="Email" value={doctor.email && <a href={`mailto:${doctor.email}`} className="text-brand-700 underline">{doctor.email}</a>} />
          <InfoRow
            label="Dirección"
            value={doctor.address && <a href={mapsUrl!} target="_blank" rel="noreferrer" className="text-brand-700 underline">{doctor.address}</a>}
          />
          <InfoRow label="Clínica / hospital" value={doctor.institution} />
          <InfoRow label="Atiende a" value={patients.join(", ")} />
          <InfoRow label="Notas" value={doctor.notes} />
        </dl>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Visitas ({visits.length})</h2>
      {visits.length === 0 ? (
        <EmptyState title="Sin visitas registradas" />
      ) : (
        <ul className="mb-8 space-y-3">
          {visits.map((v) => (
            <li key={v.id}>
              <Link href={`/visitas/${v.id}`} className="card block hover:border-brand-500">
                <p className="text-xs text-slate-500">
                  {formatDate(v.visit_date)} · {names[v.person_id]}
                </p>
                {v.reason && <p className="font-medium">{v.reason}</p>}
                {v.diagnosis && <p className="text-sm text-slate-600">Diagnóstico: {v.diagnosis}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {docs && docs.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Estudios relacionados</h2>
          <DocumentList documents={docs as MedicalDocument[]} personNames={names} />
        </>
      )}
    </>
  );
}
