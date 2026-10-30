"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFamily } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function fail(message: string): never {
  throw new Error(message);
}

// ───────────── Cuenta y familia ─────────────

export async function createFamily(formData: FormData) {
  const supabase = await createClient();
  const name = str(formData, "name") ?? fail("Poné un nombre para la familia");
  const { error } = await supabase.rpc("create_family", { p_name: name });
  if (error) fail(error.message);
  redirect("/");
}

export async function joinFamily(formData: FormData) {
  const supabase = await createClient();
  const code = str(formData, "code") ?? fail("Ingresá el código");
  const { error } = await supabase.rpc("join_family", { p_code: code });
  if (error) redirect("/bienvenida?error=codigo");
  redirect("/");
}

export async function renameFamily(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const name = str(formData, "name") ?? fail("Poné un nombre");
  await supabase.from("families").update({ name }).eq("id", family.id);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ───────────── Integrantes ─────────────

export async function savePerson(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const id = str(formData, "id");
  const values = {
    family_id: family.id,
    first_name: str(formData, "first_name") ?? fail("El nombre es obligatorio"),
    last_name: str(formData, "last_name"),
    birth_date: str(formData, "birth_date"),
    sex: str(formData, "sex"),
    blood_type: str(formData, "blood_type"),
    national_id: str(formData, "national_id"),
    health_insurance: str(formData, "health_insurance"),
    insurance_number: str(formData, "insurance_number"),
    allergies: str(formData, "allergies"),
    chronic_conditions: str(formData, "chronic_conditions"),
    medications: str(formData, "medications"),
    notes: str(formData, "notes"),
  };
  const query = id
    ? supabase.from("persons").update(values).eq("id", id).select("id").single()
    : supabase.from("persons").insert(values).select("id").single();
  const { data, error } = await query;
  if (error || !data) fail(error?.message ?? "No se pudo guardar");
  revalidatePath("/", "layout");
  redirect(`/integrantes/${data.id}`);
}

export async function deletePerson(id: string) {
  const { supabase } = await requireFamily();
  await supabase.from("persons").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/");
}

// ───────────── Médicos ─────────────

export async function saveDoctor(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const id = str(formData, "id");
  const values = {
    family_id: family.id,
    first_name: str(formData, "first_name"),
    last_name: str(formData, "last_name") ?? fail("El apellido es obligatorio"),
    specialty: str(formData, "specialty"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    address: str(formData, "address"),
    institution: str(formData, "institution"),
    notes: str(formData, "notes"),
  };
  const query = id
    ? supabase.from("doctors").update(values).eq("id", id).select("id").single()
    : supabase.from("doctors").insert(values).select("id").single();
  const { data, error } = await query;
  if (error || !data) fail(error?.message ?? "No se pudo guardar");

  const personIds = formData.getAll("person_ids").filter((v): v is string => typeof v === "string" && v !== "");
  if (personIds.length > 0) {
    await supabase
      .from("person_doctors")
      .upsert(
        personIds.map((person_id) => ({ family_id: family.id, person_id, doctor_id: data.id })),
        { ignoreDuplicates: true },
      );
  }
  revalidatePath("/", "layout");
  redirect(`/medicos/${data.id}`);
}

export async function deleteDoctor(id: string) {
  const { supabase } = await requireFamily();
  await supabase.from("doctors").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/medicos");
}

export async function linkDoctor(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const person_id = str(formData, "person_id") ?? fail("Falta el integrante");
  const doctor_id = str(formData, "doctor_id") ?? fail("Elegí un médico");
  await supabase.from("person_doctors").upsert({ family_id: family.id, person_id, doctor_id }, { ignoreDuplicates: true });
  revalidatePath("/", "layout");
}

export async function unlinkDoctor(personId: string, doctorId: string) {
  const { supabase } = await requireFamily();
  await supabase.from("person_doctors").delete().eq("person_id", personId).eq("doctor_id", doctorId);
  revalidatePath("/", "layout");
}

// ───────────── Visitas ─────────────

export async function saveVisit(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const id = str(formData, "id");
  const person_id = str(formData, "person_id") ?? fail("Elegí el integrante");
  const doctor_id = str(formData, "doctor_id");
  const values = {
    family_id: family.id,
    person_id,
    doctor_id,
    visit_date: str(formData, "visit_date") ?? fail("Poné la fecha"),
    reason: str(formData, "reason"),
    diagnosis: str(formData, "diagnosis"),
    indications: str(formData, "indications"),
    notes: str(formData, "notes"),
  };
  const { error } = id
    ? await supabase.from("visits").update(values).eq("id", id)
    : await supabase.from("visits").insert(values);
  if (error) fail(error.message);
  if (doctor_id) {
    await supabase.from("person_doctors").upsert({ family_id: family.id, person_id, doctor_id }, { ignoreDuplicates: true });
  }
  revalidatePath("/", "layout");
  redirect(str(formData, "return_to") ?? `/integrantes/${person_id}?tab=visitas`);
}

export async function deleteVisit(id: string, returnTo: string) {
  const { supabase } = await requireFamily();
  await supabase.from("visits").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(returnTo);
}

// ───────────── Historial ─────────────

export async function saveHistoryEntry(formData: FormData) {
  const { supabase, family } = await requireFamily();
  const person_id = str(formData, "person_id") ?? fail("Falta el integrante");
  const { error } = await supabase.from("history_entries").insert({
    family_id: family.id,
    person_id,
    entry_date: str(formData, "entry_date"),
    kind: str(formData, "kind") ?? "otro",
    title: str(formData, "title") ?? fail("Poné un título"),
    description: str(formData, "description"),
  });
  if (error) fail(error.message);
  revalidatePath(`/integrantes/${person_id}`);
}

export async function deleteHistoryEntry(id: string, personId: string) {
  const { supabase } = await requireFamily();
  await supabase.from("history_entries").delete().eq("id", id);
  revalidatePath(`/integrantes/${personId}`);
}

// ───────────── Estudios / documentos ─────────────

export async function updateDocument(formData: FormData) {
  const { supabase } = await requireFamily();
  const id = str(formData, "id") ?? fail("Falta el documento");
  const { error } = await supabase
    .from("documents")
    .update({
      title: str(formData, "title"),
      category: str(formData, "category"),
      study_date: str(formData, "study_date"),
      person_id: str(formData, "person_id"),
      doctor_id: str(formData, "doctor_id"),
      institution: str(formData, "institution"),
      summary: str(formData, "summary"),
    })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/", "layout");
  redirect(`/estudios/${id}`);
}

export async function deleteDocument(id: string) {
  const { supabase } = await requireFamily();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
  if (doc) await supabase.storage.from("documentos").remove([doc.storage_path]);
  await supabase.from("documents").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/estudios");
}

/** Crea un médico con los datos que la IA detectó en el documento y lo vincula. */
export async function createDoctorFromDocument(id: string) {
  const { supabase, family } = await requireFamily();
  const { data: doc } = await supabase
    .from("documents")
    .select("person_id, detected_doctor, detected_specialty, institution")
    .eq("id", id)
    .maybeSingle();
  if (!doc?.detected_doctor) fail("El documento no tiene un médico detectado");

  const cleaned = doc.detected_doctor.replace(/^(dr|dra|doctor|doctora)\.?\s+/i, "").trim();
  const parts = cleaned.split(/\s+/);
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
  const first_name = parts.length > 1 ? parts[0] : null;

  const { data: doctor, error } = await supabase
    .from("doctors")
    .insert({ family_id: family.id, first_name, last_name, specialty: doc.detected_specialty, institution: doc.institution })
    .select("id")
    .single();
  if (error || !doctor) fail(error?.message ?? "No se pudo crear el médico");

  await supabase.from("documents").update({ doctor_id: doctor.id }).eq("id", id);
  if (doc.person_id) {
    await supabase
      .from("person_doctors")
      .upsert({ family_id: family.id, person_id: doc.person_id, doctor_id: doctor.id }, { ignoreDuplicates: true });
  }
  revalidatePath("/", "layout");
  redirect(`/medicos/${doctor.id}/editar`);
}
