import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteHistoryEntry, linkDoctor, saveHistoryEntry, unlinkDoctor } from "@/app/actions";
import { ConfirmButton, SubmitButton } from "@/components/buttons";
import { DocumentList } from "@/components/document-list";
import { Badge, EmptyState, Field, InfoRow, PageHeader, Select, Tabs } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { DOCUMENT_CATEGORIES, FLAG_STYLES, HISTORY_KINDS, age, doctorName, formatDate, fullName } from "@/lib/labels";
import type { Doctor, HistoryEntry, MedicalDocument, Person, Visit } from "@/lib/types";

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "historial", label: "Historial" },
  { key: "estudios", label: "Estudios" },
  { key: "valores", label: "Valores" },
  { key: "medicos", label: "Médicos" },
  { key: "visitas", label: "Visitas" },
];

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "resumen" } = await searchParams;
  const { supabase, family } = await requireFamily();

  const { data: personRow } = await supabase.from("persons").select("*").eq("id", id).maybeSingle();
  if (!personRow) notFound();
  const person = personRow as Person;

  const [{ data: docs }, { data: visitRows }, { data: historyRows }, { data: links }, { data: allDoctors }] = await Promise.all([
    supabase.from("documents").select("*").eq("person_id", id).order("study_date", { ascending: false, nullsFirst: false }),
    supabase.from("visits").select("*").eq("person_id", id).order("visit_date", { ascending: false }),
    supabase.from("history_entries").select("*").eq("person_id", id).order("entry_date", { ascending: false, nullsFirst: false }),
    supabase.from("person_doctors").select("doctor_id").eq("person_id", id),
    supabase.from("doctors").select("*").eq("family_id", family.id).order("last_name"),
  ]);

  const documents = (docs ?? []) as MedicalDocument[];
  const visits = (visitRows ?? []) as Visit[];
  const history = (historyRows ?? []) as HistoryEntry[];
  const doctors = (allDoctors ?? []) as Doctor[];
  const doctorsById = Object.fromEntries(doctors.map((d) => [d.id, d]));
  const linkedIds = new Set((links ?? []).map((l) => l.doctor_id));
  const myDoctors = doctors.filter((d) => linkedIds.has(d.id));
  const years = age(person.birth_date);

  return (
    <>
      <PageHeader
        title={fullName(person)}
        back={{ href: "/", label: "Inicio" }}
        subtitle={[years !== null ? `${years} años` : null, person.health_insurance].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/subir?persona=${id}`} className="btn-primary">
              + Estudio
            </Link>
            <Link href={`/visitas/nueva?persona=${id}`} className="btn-secondary">
              + Visita
            </Link>
            <Link href={`/integrantes/${id}/editar`} className="btn-secondary">
              Editar
            </Link>
          </>
        }
      />

      <Tabs tabs={TABS.map((t) => ({ ...t, href: `/integrantes/${id}?tab=${t.key}` }))} active={tab} />

      {tab === "resumen" && <Summary person={person} documents={documents} visits={visits} doctorsById={doctorsById} />}
      {tab === "historial" && <Timeline person={person} history={history} visits={visits} documents={documents} doctorsById={doctorsById} />}
      {tab === "estudios" &&
        (documents.length ? (
          <DocumentList documents={documents} />
        ) : (
          <EmptyState title="Sin estudios">
            <Link href={`/subir?persona=${id}`} className="text-brand-700 underline">
              Subir un estudio
            </Link>
          </EmptyState>
        ))}
      {tab === "valores" && <LabValues documents={documents} />}
      {tab === "medicos" && <PersonDoctors person={person} myDoctors={myDoctors} otherDoctors={doctors.filter((d) => !linkedIds.has(d.id))} />}
      {tab === "visitas" && <VisitList visits={visits} doctorsById={doctorsById} personId={id} />}
    </>
  );
}

function Summary({
  person,
  documents,
  visits,
  doctorsById,
}: {
  person: Person;
  documents: MedicalDocument[];
  visits: Visit[];
  doctorsById: Record<string, Doctor>;
}) {
  const lastVisit = visits[0];
  const recentHighlights = documents.filter((d) => d.status === "listo" && d.highlights?.length).slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <h3 className="mb-2 font-semibold">Datos personales</h3>
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Fecha de nacimiento" value={person.birth_date ? formatDate(person.birth_date) : null} />
          <InfoRow label="DNI" value={person.national_id} />
          <InfoRow label="Grupo sanguíneo" value={person.blood_type} />
          <InfoRow label="Obra social" value={[person.health_insurance, person.insurance_number].filter(Boolean).join(" · N° ")} />
          <InfoRow label="Notas" value={person.notes} />
        </dl>
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold">Información clínica clave</h3>
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Alergias" value={person.allergies ? <span className="font-medium text-red-700">{person.allergies}</span> : "Ninguna cargada"} />
          <InfoRow label="Condiciones" value={person.chronic_conditions ?? "Ninguna cargada"} />
          <InfoRow label="Medicación" value={person.medications ?? "Ninguna cargada"} />
          <InfoRow
            label="Última visita"
            value={
              lastVisit
                ? `${formatDate(lastVisit.visit_date)}${lastVisit.doctor_id && doctorsById[lastVisit.doctor_id] ? " · " + doctorName(doctorsById[lastVisit.doctor_id]) : ""}${lastVisit.reason ? " · " + lastVisit.reason : ""}`
                : "—"
            }
          />
        </dl>
      </div>
      {recentHighlights.length > 0 && (
        <div className="card lg:col-span-2">
          <h3 className="mb-3 font-semibold">Para tener en cuenta (según los últimos estudios)</h3>
          <ul className="space-y-3">
            {recentHighlights.map((d) => (
              <li key={d.id}>
                <Link href={`/estudios/${d.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {d.title} · {formatDate(d.study_date)}
                </Link>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                  {d.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Generado por IA a partir de los documentos. No reemplaza la opinión de un médico.</p>
        </div>
      )}
    </div>
  );
}

type TimelineItem = { date: string | null; kind: string; title: string; detail?: string | null; href?: string; onDelete?: () => Promise<void> };

function Timeline({
  person,
  history,
  visits,
  documents,
  doctorsById,
}: {
  person: Person;
  history: HistoryEntry[];
  visits: Visit[];
  documents: MedicalDocument[];
  doctorsById: Record<string, Doctor>;
}) {
  const items: TimelineItem[] = [
    ...history.map((h) => ({
      date: h.entry_date,
      kind: HISTORY_KINDS[h.kind] ?? h.kind,
      title: h.title,
      detail: h.description,
      onDelete: deleteHistoryEntry.bind(null, h.id, person.id),
    })),
    ...visits.map((v) => ({
      date: v.visit_date,
      kind: "Visita",
      title: [v.doctor_id && doctorsById[v.doctor_id] ? doctorName(doctorsById[v.doctor_id]) : "Consulta", v.reason].filter(Boolean).join(" — "),
      detail: v.diagnosis,
      href: `/visitas/${v.id}`,
    })),
    ...documents.map((d) => ({
      date: d.study_date,
      kind: DOCUMENT_CATEGORIES[d.category ?? "otro"] ?? "Estudio",
      title: d.title ?? d.file_name ?? "Documento",
      detail: d.diagnoses?.join(" · ") || null,
      href: `/estudios/${d.id}`,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {items.length === 0 ? (
          <EmptyState title="El historial está vacío">Agregá diagnósticos, cirugías o vacunas, o subí estudios.</EmptyState>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
            {items.map((item, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      {formatDate(item.date)} · <span className="font-medium">{item.kind}</span>
                    </p>
                    {item.href ? (
                      <Link href={item.href} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-900">{item.title}</p>
                    )}
                    {item.detail && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{item.detail}</p>}
                  </div>
                  {item.onDelete && (
                    <ConfirmButton action={item.onDelete} className="text-xs text-slate-400 hover:text-red-600">
                      Borrar
                    </ConfirmButton>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form action={saveHistoryEntry} className="card h-fit space-y-3">
        <h3 className="font-semibold">Agregar al historial</h3>
        <input type="hidden" name="person_id" value={person.id} />
        <Select label="Tipo" name="kind" defaultValue="diagnostico" options={Object.entries(HISTORY_KINDS).map(([value, label]) => ({ value, label }))} />
        <Field label="Título" name="title" required placeholder="Ej: Apendicectomía" />
        <Field label="Fecha" name="entry_date" type="date" />
        <Field label="Detalle" name="description" textarea />
        <SubmitButton>Agregar</SubmitButton>
      </form>
    </div>
  );
}

function LabValues({ documents }: { documents: MedicalDocument[] }) {
  const series = new Map<string, { name: string; rows: { date: string | null; value: string; unit: string | null; flag: string; docId: string }[] }>();
  for (const d of documents) {
    for (const f of d.findings ?? []) {
      const key = f.name.trim().toLowerCase();
      if (!series.has(key)) series.set(key, { name: f.name, rows: [] });
      series.get(key)!.rows.push({ date: d.study_date, value: f.value, unit: f.unit, flag: f.flag, docId: d.id });
    }
  }
  const list = [...series.values()].sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name));

  if (list.length === 0) {
    return <EmptyState title="Todavía no hay valores">Cuando subas análisis de laboratorio, acá vas a ver cómo evoluciona cada valor.</EmptyState>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((s) => (
        <div key={s.name} className="card">
          <h3 className="mb-2 font-semibold">{s.name}</h3>
          <table className="w-full text-sm">
            <tbody>
              {s.rows
                .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                .map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-500">
                      <Link href={`/estudios/${r.docId}`} className="hover:underline">
                        {formatDate(r.date)}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {r.value} {r.unit && <span className="font-normal text-slate-500">{r.unit}</span>}
                    </td>
                    <td className="w-24 py-1.5 text-right">
                      {r.flag !== "sin_referencia" && <Badge className={FLAG_STYLES[r.flag]?.className}>{FLAG_STYLES[r.flag]?.label}</Badge>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function PersonDoctors({ person, myDoctors, otherDoctors }: { person: Person; myDoctors: Doctor[]; otherDoctors: Doctor[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {myDoctors.length === 0 && <EmptyState title={`${person.first_name} no tiene médicos asignados`} />}
        {myDoctors.map((d) => (
          <div key={d.id} className="card flex items-center justify-between gap-3">
            <Link href={`/medicos/${d.id}`} className="min-w-0">
              <p className="font-semibold hover:text-brand-700">{doctorName(d)}</p>
              <p className="text-sm text-slate-500">{[d.specialty, d.phone].filter(Boolean).join(" · ")}</p>
            </Link>
            <ConfirmButton
              action={unlinkDoctor.bind(null, person.id, d.id)}
              message="¿Quitar este médico de la lista? (No se borra el médico)"
              className="text-xs text-slate-400 hover:text-red-600"
            >
              Quitar
            </ConfirmButton>
          </div>
        ))}
      </div>
      <div className="card h-fit space-y-3">
        <h3 className="font-semibold">Asignar médico</h3>
        {otherDoctors.length > 0 && (
          <form action={linkDoctor} className="space-y-3">
            <input type="hidden" name="person_id" value={person.id} />
            <Select
              label="Médico ya cargado"
              name="doctor_id"
              required
              emptyLabel="Elegí…"
              options={otherDoctors.map((d) => ({ value: d.id, label: `${doctorName(d)}${d.specialty ? " — " + d.specialty : ""}` }))}
            />
            <SubmitButton>Asignar</SubmitButton>
          </form>
        )}
        <Link href={`/medicos/nuevo?persona=${person.id}`} className="btn-secondary w-full">
          + Cargar médico nuevo
        </Link>
      </div>
    </div>
  );
}

function VisitList({ visits, doctorsById, personId }: { visits: Visit[]; doctorsById: Record<string, Doctor>; personId: string }) {
  if (visits.length === 0) {
    return (
      <EmptyState title="No hay visitas registradas">
        <Link href={`/visitas/nueva?persona=${personId}`} className="text-brand-700 underline">
          Registrar una visita
        </Link>
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-3">
      {visits.map((v) => (
        <li key={v.id}>
          <Link href={`/visitas/${v.id}`} className="card block hover:border-brand-500">
            <p className="text-xs text-slate-500">{formatDate(v.visit_date)}</p>
            <p className="font-semibold">
              {v.doctor_id && doctorsById[v.doctor_id] ? doctorName(doctorsById[v.doctor_id]) : "Consulta"}
              {v.doctor_id && doctorsById[v.doctor_id]?.specialty && (
                <span className="font-normal text-slate-500"> · {doctorsById[v.doctor_id].specialty}</span>
              )}
            </p>
            {v.reason && <p className="text-sm text-slate-700">Motivo: {v.reason}</p>}
            {v.diagnosis && <p className="text-sm text-slate-700">Diagnóstico: {v.diagnosis}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
