import { NextResponse } from "next/server";
import { analyzeDocument, isSupportedMime } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// La API acepta hasta 32 MB por pedido; dejamos margen para el resto del mensaje.
const MAX_TOTAL_BYTES = 22 * 1024 * 1024;
const MAX_PAGES = 30;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // RLS garantiza que solo se lean documentos de la propia familia.
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const fail = async (message: string, status = 500) => {
    await supabase.from("documents").update({ status: "error", error_message: message }).eq("id", id);
    return NextResponse.json({ error: message }, { status });
  };

  if (!process.env.ANTHROPIC_API_KEY) return fail("Falta configurar la clave de la IA (ANTHROPIC_API_KEY).");

  const { data: files } = await supabase
    .from("document_files")
    .select("storage_path, mime_type")
    .eq("document_id", id)
    .order("position")
    .order("created_at");
  if (!files || files.length === 0) return fail("El estudio no tiene hojas cargadas.", 400);
  if (files.length > MAX_PAGES) return fail(`El estudio tiene más de ${MAX_PAGES} hojas. Dividilo en partes.`, 400);
  if (files.some((f) => !isSupportedMime(f.mime_type))) return fail("Formato no soportado: subí fotos (JPG/PNG) o PDF.", 400);

  await supabase.from("documents").update({ status: "procesando", error_message: null }).eq("id", id);

  const pages: { data: Buffer; mimeType: string }[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const { data: blob, error } = await supabase.storage.from("documentos").download(file.storage_path);
    if (error || !blob) return fail("No se pudo leer uno de los archivos subidos.");
    totalBytes += blob.size;
    if (totalBytes > MAX_TOTAL_BYTES) return fail("Las hojas de este estudio pesan demasiado en total (máx. 22 MB).", 400);
    pages.push({ data: Buffer.from(await blob.arrayBuffer()), mimeType: file.mime_type });
  }

  const [{ data: persons }, { data: doctors }] = await Promise.all([
    supabase.from("persons").select("id, first_name, last_name, birth_date, sex").eq("family_id", doc.family_id),
    supabase.from("doctors").select("id, first_name, last_name, specialty").eq("family_id", doc.family_id),
  ]);

  try {
    const result = await analyzeDocument({
      pages,
      persons: persons ?? [],
      doctors: doctors ?? [],
      hintPersonId: doc.person_id,
    });

    const personId = doc.person_id ?? result.person_id;
    const doctorId = doc.doctor_id ?? result.doctor_id;

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "listo",
        error_message: null,
        category: result.category,
        title: result.title,
        study_date: result.study_date,
        person_id: personId,
        doctor_id: doctorId,
        institution: result.institution,
        detected_patient: result.patient_name,
        detected_doctor: result.doctor_name,
        detected_specialty: result.doctor_specialty,
        summary: result.summary,
        findings: result.findings,
        diagnoses: result.diagnoses,
        highlights: result.highlights,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) return fail("No se pudo guardar el resultado del análisis.");

    if (personId && doctorId) {
      await supabase
        .from("person_doctors")
        .upsert({ family_id: doc.family_id, person_id: personId, doctor_id: doctorId }, { ignoreDuplicates: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error analizando documento", id, error);
    const message = error instanceof Error && !("status" in error) ? error.message : "La IA no respondió. Probá de nuevo en un rato.";
    return fail(message);
  }
}
