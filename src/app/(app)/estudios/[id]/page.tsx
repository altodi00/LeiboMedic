import Link from "next/link";
import { notFound } from "next/navigation";
import { createDoctorFromDocument, deleteDocument, deleteDocumentFile, updateDocument } from "@/app/actions";
import { AddPagesButton } from "@/components/add-pages-button";
import { ConfirmButton, SubmitButton } from "@/components/buttons";
import { ReanalyzeButton } from "@/components/reanalyze-button";
import { Badge, Field, InfoRow, PageHeader, Select } from "@/components/ui";
import { requireFamily } from "@/lib/family";
import { DOCUMENT_CATEGORIES, FLAG_STYLES, doctorName, formatDate, fullName } from "@/lib/labels";
import type { Doctor, DocumentFile, MedicalDocument, Person } from "@/lib/types";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id } = await params;
  const { editar } = await searchParams;
  const { supabase, family } = await requireFamily();

  const { data: row } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const doc = row as MedicalDocument;

  const [{ data: fileRows }, { data: persons }, { data: doctors }] = await Promise.all([
    supabase.from("document_files").select("*").eq("document_id", id).order("position").order("created_at"),
    supabase.from("persons").select("*").eq("family_id", family.id).order("first_name"),
    supabase.from("doctors").select("*").eq("family_id", family.id).order("last_name"),
  ]);
  const person = (persons as Person[] | null)?.find((p) => p.id === doc.person_id);
  const doctor = (doctors as Doctor[] | null)?.find((d) => d.id === doc.doctor_id);
  const files = (fileRows ?? []) as DocumentFile[];
  const { data: signed } = files.length
    ? await supabase.storage.from("documentos").createSignedUrls(files.map((f) => f.storage_path), 60 * 60)
    : { data: [] };
  const urls = Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const nextPosition = files.reduce((max, f) => Math.max(max, f.position), -1) + 1;
  const editing = editar === "1" || doc.status === "error";

  return (
    <>
      <PageHeader
        title={doc.title ?? "Documento"}
        back={{ href: person ? `/integrantes/${person.id}?tab=estudios` : "/estudios", label: person ? fullName(person) : "Estudios" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatDate(doc.study_date)}</span>
            {doc.category && <Badge>{DOCUMENT_CATEGORIES[doc.category] ?? doc.category}</Badge>}
          </span>
        }
        actions={
          !editing && (
            <Link href={`/estudios/${id}?editar=1`} className="btn-secondary">
              Corregir datos
            </Link>
          )
        }
      />

      {doc.status === "error" && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">No se pudo analizar automáticamente.</p>
          <p>{doc.error_message}</p>
          <div className="mt-3">
            <ReanalyzeButton documentId={id} label="Reintentar" />
          </div>
        </div>
      )}
      {(doc.status === "pendiente" || doc.status === "procesando") && (
        <div className="mb-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
          <p>Este documento todavía no fue analizado.</p>
          <div className="mt-3">
            <ReanalyzeButton documentId={id} label="Analizar ahora" />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {editing ? (
            <form action={updateDocument} className="card space-y-4">
              <h2 className="font-semibold">Corregir datos</h2>
              <input type="hidden" name="id" value={id} />
              <Field label="Título" name="title" defaultValue={doc.title} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Tipo"
                  name="category"
                  defaultValue={doc.category ?? "otro"}
                  options={Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => ({ value, label }))}
                />
                <Field label="Fecha del estudio" name="study_date" type="date" defaultValue={doc.study_date} />
                <Select
                  label="Integrante"
                  name="person_id"
                  defaultValue={doc.person_id}
                  emptyLabel="Sin asignar"
                  options={((persons ?? []) as Person[]).map((p) => ({ value: p.id, label: fullName(p) }))}
                />
                <Select
                  label="Médico"
                  name="doctor_id"
                  defaultValue={doc.doctor_id}
                  emptyLabel="Sin asignar"
                  options={((doctors ?? []) as Doctor[]).map((d) => ({ value: d.id, label: doctorName(d) }))}
                />
              </div>
              <Field label="Institución / laboratorio" name="institution" defaultValue={doc.institution} />
              <Field label="Resumen" name="summary" defaultValue={doc.summary} textarea />
              <div className="flex gap-2">
                <SubmitButton>Guardar</SubmitButton>
                <Link href={`/estudios/${id}`} className="btn-secondary">
                  Cancelar
                </Link>
              </div>
            </form>
          ) : (
            <>
              <div className="card">
                <dl className="divide-y divide-slate-100">
                  <InfoRow
                    label="Integrante"
                    value={
                      person ? (
                        <Link href={`/integrantes/${person.id}`} className="text-brand-700 underline">
                          {fullName(person)}
                        </Link>
                      ) : (
                        <span className="text-amber-700">Sin asignar{doc.detected_patient ? ` (figura: ${doc.detected_patient})` : ""}</span>
                      )
                    }
                  />
                  <InfoRow
                    label="Médico"
                    value={
                      doctor ? (
                        <Link href={`/medicos/${doctor.id}`} className="text-brand-700 underline">
                          {doctorName(doctor)}
                        </Link>
                      ) : (
                        doc.detected_doctor && (
                          <span className="flex flex-wrap items-center gap-2">
                            {doc.detected_doctor}
                            {doc.detected_specialty && ` (${doc.detected_specialty})`}
                            <form action={createDoctorFromDocument.bind(null, id)}>
                              <SubmitButton className="text-sm font-medium text-brand-700 underline" pendingText="Creando…">
                                + Agregar a mis médicos
                              </SubmitButton>
                            </form>
                          </span>
                        )
                      )
                    }
                  />
                  <InfoRow label="Institución" value={doc.institution} />
                </dl>
              </div>

              {doc.summary && (
                <div className="card">
                  <h2 className="mb-2 font-semibold">Resumen</h2>
                  <p className="whitespace-pre-line text-sm text-slate-700">{doc.summary}</p>
                  {doc.diagnoses?.length > 0 && (
                    <>
                      <h3 className="mb-1 mt-4 text-sm font-semibold">Diagnósticos / conclusiones del documento</h3>
                      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                        {doc.diagnoses.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {doc.highlights?.length > 0 && (
                    <>
                      <h3 className="mb-1 mt-4 text-sm font-semibold">Para tener en cuenta</h3>
                      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                        {doc.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="mt-4 text-xs text-slate-400">Generado por IA. Puede tener errores: verificá siempre con el documento original y con tu médico.</p>
                </div>
              )}

              {doc.findings?.length > 0 && (
                <div className="card overflow-x-auto">
                  <h2 className="mb-2 font-semibold">Valores</h2>
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2">Determinación</th>
                        <th className="py-2 text-right">Resultado</th>
                        <th className="py-2 pl-4">Referencia</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.findings.map((f, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-2">{f.name}</td>
                          <td className="py-2 text-right font-medium">
                            {f.value} {f.unit && <span className="font-normal text-slate-500">{f.unit}</span>}
                          </td>
                          <td className="py-2 pl-4 text-slate-500">{f.reference ?? "—"}</td>
                          <td className="py-2 text-right">
                            {f.flag !== "sin_referencia" && <Badge className={FLAG_STYLES[f.flag]?.className}>{FLAG_STYLES[f.flag]?.label}</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {doc.status === "listo" && <ReanalyzeButton documentId={id} />}
            <ConfirmButton action={deleteDocument.bind(null, id)} message="Se va a borrar el estudio y el archivo. ¿Seguro?">
              Borrar estudio
            </ConfirmButton>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <h2 className="mb-3 font-semibold">
              {files.length > 1 ? `Hojas del estudio (${files.length})` : "Archivo original"}
            </h2>
            {files.length === 0 && <p className="text-sm text-slate-500">Este estudio no tiene hojas cargadas.</p>}
            <ol className="space-y-4">
              {files.map((f, i) => {
                const url = urls[f.storage_path];
                return (
                  <li key={f.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-500">{files.length > 1 ? `Hoja ${i + 1}` : f.file_name}</span>
                      <span className="flex items-center gap-3">
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                            Abrir
                          </a>
                        )}
                        {files.length > 1 && (
                          <ConfirmButton
                            action={deleteDocumentFile.bind(null, f.id, id)}
                            message="¿Borrar esta hoja del estudio? Después podés volver a analizarlo."
                            className="text-slate-400 hover:text-red-600"
                          >
                            Borrar
                          </ConfirmButton>
                        )}
                      </span>
                    </div>
                    {!url ? (
                      <p className="text-sm text-slate-500">No se pudo cargar el archivo.</p>
                    ) : f.mime_type === "application/pdf" ? (
                      <iframe src={url} title={`Hoja ${i + 1}`} className="h-[70vh] w-full rounded-lg border border-slate-200" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={`Hoja ${i + 1}`} className="w-full rounded-lg border border-slate-200" />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-sm text-slate-600">¿Faltó alguna hoja? Agregala y la IA vuelve a leer el estudio completo.</p>
              <AddPagesButton familyId={family.id} documentId={id} nextPosition={nextPosition} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
