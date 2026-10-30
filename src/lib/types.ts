export type Person = {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  sex: string | null;
  blood_type: string | null;
  national_id: string | null;
  health_insurance: string | null;
  insurance_number: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  medications: string | null;
  notes: string | null;
};

export type Doctor = {
  id: string;
  family_id: string;
  first_name: string | null;
  last_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  institution: string | null;
  notes: string | null;
};

export type Visit = {
  id: string;
  family_id: string;
  person_id: string;
  doctor_id: string | null;
  visit_date: string;
  reason: string | null;
  diagnosis: string | null;
  indications: string | null;
  notes: string | null;
};

export type HistoryEntry = {
  id: string;
  family_id: string;
  person_id: string;
  entry_date: string | null;
  kind: string;
  title: string;
  description: string | null;
};

export type Finding = {
  name: string;
  value: string;
  unit: string | null;
  reference: string | null;
  flag: "normal" | "alto" | "bajo" | "anormal" | "sin_referencia";
};

export type MedicalDocument = {
  id: string;
  family_id: string;
  person_id: string | null;
  doctor_id: string | null;
  visit_id: string | null;
  status: "pendiente" | "procesando" | "listo" | "error";
  error_message: string | null;
  category: string | null;
  title: string | null;
  study_date: string | null;
  institution: string | null;
  detected_patient: string | null;
  detected_doctor: string | null;
  detected_specialty: string | null;
  summary: string | null;
  findings: Finding[];
  diagnoses: string[];
  highlights: string[];
  created_at: string;
};

export type DocumentFile = {
  id: string;
  document_id: string;
  position: number;
  storage_path: string;
  file_name: string | null;
  mime_type: string;
  file_size: number | null;
};
