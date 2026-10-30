import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Doctor, Person } from "@/lib/types";

const MODEL = "claude-opus-5-5";

const CATEGORIES = ["laboratorio", "imagen", "cardiologico", "informe_medico", "receta", "certificado", "vacunacion", "epicrisis", "otro"];
const FLAGS = ["normal", "alto", "bajo", "anormal", "sin_referencia"] as const;

// Las listas de valores van en la descripción; se validan después de recibir la respuesta.
export const AnalysisSchema = z.object({
  category: z.string().describe(`Exactamente uno de: ${CATEGORIES.join(", ")}`),
  title: z.string().describe("Título corto y claro, ej: 'Hemograma completo' o 'Ecografía abdominal'"),
  study_date: z.string().nullable().describe("Fecha del estudio en formato YYYY-MM-DD, o null si no figura"),
  person_id: z.string().nullable().describe("id del integrante de la familia al que corresponde, o null si no hay coincidencia clara"),
  patient_name: z.string().nullable().describe("Nombre del paciente tal como figura en el documento"),
  doctor_id: z.string().nullable().describe("id del médico ya cargado que firma o solicita el estudio, o null"),
  doctor_name: z.string().nullable().describe("Nombre del médico tal como figura en el documento"),
  doctor_specialty: z.string().nullable(),
  institution: z.string().nullable().describe("Laboratorio, clínica u hospital"),
  summary: z.string().describe("Resumen en lenguaje simple, 2 a 5 oraciones"),
  findings: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().nullable(),
        reference: z.string().nullable().describe("Valores de referencia tal como figuran"),
        flag: z.string().describe(`Exactamente uno de: ${FLAGS.join(", ")}`),
      }),
    )
    .describe("Valores medidos (análisis de laboratorio, mediciones). Vacío si no aplica."),
  diagnoses: z.array(z.string()).describe("Diagnósticos o conclusiones que el documento menciona explícitamente"),
  highlights: z
    .array(z.string())
    .describe("Puntos a tener en cuenta: valores fuera de rango, indicaciones, controles sugeridos"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const SYSTEM_PROMPT = `Sos un asistente que ordena documentación médica de una familia argentina.
Recibís la foto o el PDF de un estudio, análisis, receta o informe y extraés su información de forma fiel.

Reglas:
- Transcribí los valores exactamente como figuran (números, unidades, valores de referencia). No inventes datos: si algo no está o no se lee, usá null.
- Marcá "alto"/"bajo"/"anormal" solo comparando con el valor de referencia impreso en el propio documento; si no hay referencia, usá "sin_referencia".
- En "diagnoses" incluí solo lo que el documento dice explícitamente. No diagnostiques vos.
- El resumen es para una persona sin formación médica: claro, en castellano rioplatense, sin alarmismo. No des recomendaciones de tratamiento.
- Para person_id y doctor_id elegí únicamente entre los ids de las listas provistas, y solo si la coincidencia es clara (nombre, apellido, edad o sexo compatibles). Si dudás, devolvé null.
- Las fechas van en formato YYYY-MM-DD. Las fechas en documentos argentinos suelen estar escritas como DD/MM/AAAA.`;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export function isSupportedMime(mime: string) {
  return mime === "application/pdf" || (IMAGE_TYPES as readonly string[]).includes(mime);
}

export async function analyzeDocument(params: {
  pages: { data: Buffer; mimeType: string }[];
  persons: Pick<Person, "id" | "first_name" | "last_name" | "birth_date" | "sex">[];
  doctors: Pick<Doctor, "id" | "first_name" | "last_name" | "specialty">[];
  hintPersonId?: string | null;
}): Promise<Analysis> {
  const client = new Anthropic();
  const total = params.pages.length;
  const pageBlocks: Anthropic.Beta.BetaContentBlockParam[] = params.pages.flatMap(({ data, mimeType }, i) => {
    const base64 = data.toString("base64");
    const block: Anthropic.Beta.BetaContentBlockParam =
      mimeType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image", source: { type: "base64", media_type: mimeType as ImageType, data: base64 } };
    return total > 1 ? [{ type: "text", text: `Hoja ${i + 1} de ${total}:` }, block] : [block];
  });

  const context = {
    integrantes_de_la_familia: params.persons.map((p) => ({
      id: p.id,
      nombre: [p.first_name, p.last_name].filter(Boolean).join(" "),
      fecha_nacimiento: p.birth_date,
      sexo: p.sex,
    })),
    medicos_cargados: params.doctors.map((d) => ({
      id: d.id,
      nombre: [d.first_name, d.last_name].filter(Boolean).join(" "),
      especialidad: d.specialty,
    })),
    integrante_indicado_por_el_usuario: params.hintPersonId ?? null,
  };

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low", format: betaZodOutputFormat(AnalysisSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          ...pageBlocks,
          {
            type: "text",
            text:
              (total > 1
                ? `Estas ${total} hojas forman un único estudio o documento médico. Analizalas en conjunto. `
                : "Analizá este documento médico. ") +
              "Contexto de la familia (JSON):\n" +
              JSON.stringify(context, null, 2) +
              "\nSi el usuario indicó un integrante, usalo salvo que el documento muestre claramente que es de otra persona.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La IA no pudo procesar este documento. Podés cargar los datos a mano.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("El documento es demasiado largo para analizarlo de una vez.");
  }
  if (!response.parsed_output) {
    throw new Error("La IA devolvió una respuesta que no se pudo interpretar.");
  }

  const result = response.parsed_output;
  const category = result.category.trim().toLowerCase();
  result.category = CATEGORIES.includes(category) ? category : "otro";
  for (const f of result.findings) {
    const flag = f.flag.trim().toLowerCase();
    f.flag = (FLAGS as readonly string[]).includes(flag) ? flag : "sin_referencia";
  }
  // Nunca confiar en ids que no estén en las listas enviadas.
  if (result.person_id && !params.persons.some((p) => p.id === result.person_id)) result.person_id = null;
  if (result.doctor_id && !params.doctors.some((d) => d.id === result.doctor_id)) result.doctor_id = null;
  if (result.study_date && !/^\d{4}-\d{2}-\d{2}$/.test(result.study_date)) result.study_date = null;
  return result;
}
