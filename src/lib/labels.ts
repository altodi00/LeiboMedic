export const DOCUMENT_CATEGORIES: Record<string, string> = {
  laboratorio: "Análisis de laboratorio",
  imagen: "Estudio por imágenes",
  cardiologico: "Estudio cardiológico",
  informe_medico: "Informe médico",
  receta: "Receta / indicación",
  certificado: "Certificado",
  vacunacion: "Vacunación",
  epicrisis: "Epicrisis / alta",
  otro: "Otro",
};

export const HISTORY_KINDS: Record<string, string> = {
  diagnostico: "Diagnóstico",
  cirugia: "Cirugía",
  vacuna: "Vacuna",
  internacion: "Internación",
  alergia: "Alergia",
  medicacion: "Medicación",
  tratamiento: "Tratamiento",
  otro: "Otro",
};

export const FLAG_STYLES: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  alto: { label: "Alto", className: "bg-red-50 text-red-700 ring-red-200" },
  bajo: { label: "Bajo", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  anormal: { label: "Anormal", className: "bg-red-50 text-red-700 ring-red-200" },
  sin_referencia: { label: "—", className: "bg-slate-50 text-slate-500 ring-slate-200" },
};

export function fullName(p: { first_name: string | null; last_name: string | null }) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

export function doctorName(d: { first_name: string | null; last_name: string }) {
  return "Dr/a. " + [d.first_name, d.last_name].filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function age(birthDate: string | null) {
  if (!birthDate) return null;
  const b = new Date(birthDate + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return years;
}
