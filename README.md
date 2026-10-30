# LeiboMedic

Web app para tener en un solo lugar toda la información médica de un grupo familiar:

- **Integrantes**: datos personales, obra social, grupo sanguíneo, alergias, condiciones y medicación.
- **Historial**: línea de tiempo con diagnósticos, cirugías, vacunas, internaciones, visitas y estudios.
- **Estudios**: se suben con fotos o PDF (un estudio puede tener varias hojas) y una IA (Claude, de Anthropic) los clasifica: tipo de estudio, fecha, a quién corresponde, médico, institución, resumen en lenguaje simple y la tabla de valores con los que están fuera de rango.
- **Valores**: evolución de cada valor de laboratorio (ej. colesterol, glucemia) a lo largo del tiempo.
- **Médicos**: especialidad, nombre, teléfono, email, dirección (con link a Google Maps), a quién atiende y todas las visitas.
- **Visitas**: fecha, médico, motivo, diagnóstico e indicaciones.
- **Varias cuentas por familia**: cada persona entra con su email y se suma al grupo con un código de invitación.

Funciona en el celular (se puede "agregar a la pantalla de inicio") y en la computadora.

---

## Cómo ponerla en marcha (sin saber programar)

Se usan tres servicios. Los dos primeros tienen plan gratuito; el tercero se paga por uso.

| Servicio | Para qué | Costo |
|---|---|---|
| [Supabase](https://supabase.com) | Base de datos, archivos y cuentas de usuario | Gratis (plan Free) |
| [Vercel](https://vercel.com) | Publicar la página en internet | Gratis (plan Hobby, uso personal) |
| [Anthropic](https://console.anthropic.com) | La IA que lee los estudios | Pago por uso (ver abajo) |

### Paso 1 — Supabase (la base de datos)

1. Entrá a https://supabase.com, creá una cuenta y apretá **New project**. Elegí un nombre, una contraseña (guardala) y la región **South America (São Paulo)**.
2. Cuando termine de crearse, andá al menú de la izquierda → **SQL Editor** → **New query**.
3. Abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este repositorio, copiá **todo** su contenido, pegalo y apretá **Run**. Tiene que decir "Success".
4. Anotá dos datos. La forma más simple es el botón **Connect**, arriba en la página principal del proyecto, que muestra los dos juntos. Si no lo ves:
   - **Project URL** (algo como `https://abcd1234.supabase.co`): en **Project Settings → Data API**.
   - **Publishable key** (empieza con `sb_publishable_`) o, en proyectos más viejos, la **anon public key** (empieza con `eyJ`): en **Project Settings → API Keys**. Cualquiera de las dos sirve. Nunca uses la *secret* ni la *service_role*.
5. (Opcional, recomendado para uso familiar) **Authentication → Sign In / Providers → Email** y desactivá **Confirm email**, así no hace falta confirmar el email al crear la cuenta.

### Paso 2 — Anthropic (la IA) — opcional

Sin este paso la app funciona igual: los estudios se suben y los datos (tipo, fecha, valores, etc.) se cargan a mano. La IA se puede activar después agregando la clave en Vercel (paso 3) y volviendo a publicar (**Deployments → ⋯ → Redeploy**).

1. Entrá a https://console.anthropic.com y creá una cuenta.
2. En **Billing**, cargá crédito (alcanza con el mínimo).
3. En **API Keys**, creá una clave y copiala (empieza con `sk-ant-`). Solo se muestra una vez.

### Paso 3 — Vercel (publicarla)

1. Entrá a https://vercel.com y creá una cuenta **con tu usuario de GitHub**.
2. **Add New → Project** → elegí el repositorio **LeiboMedic** → **Import**.
3. En **Environment Variables** agregá estas variables (la tercera solo si hiciste el paso 2):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la Project URL del paso 1, **sin** `/rest/v1/` al final |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la publishable key (o anon key) del paso 1 |
   | `ANTHROPIC_API_KEY` | la clave del paso 2 |

4. Apretá **Deploy**. En uno o dos minutos te da la dirección de tu app (algo como `https://leibomedic.vercel.app`).
5. Volvé a Supabase → **Authentication → URL Configuration** y en **Site URL** pegá esa dirección.

### Paso 4 — Usarla

1. Abrí la dirección, apretá **Creá una cuenta** y creá el grupo familiar.
2. Agregá a cada integrante.
3. Tocá **Subir** y sacale una foto a un estudio. Si tiene más hojas, tocá **Agregar hoja** para sumarlas al mismo estudio. Después tocá **Subir y analizar** y esperá unos segundos.
4. Para que otra persona use la misma familia: en **Familia** está el código de invitación.

---

## Costos aproximados de la IA

Cada estudio analizado es una consulta al modelo Claude Opus 5.5 (US$4 por millón de tokens de entrada y US$20 por millón de salida). Un estudio de 1–2 hojas debería costar del orden de **US$0,02 a US$0,10**; es una estimación, el costo real se ve en https://console.anthropic.com (Usage).

## Privacidad

- Los datos y archivos quedan en tu proyecto de Supabase, en un bucket privado. Cada familia solo puede ver lo suyo (reglas de seguridad a nivel base de datos).
- Para clasificar un estudio, sus hojas se envían a la API de Anthropic.
- Cualquiera que tenga el código de invitación puede entrar a la familia: compartilo solo con gente de confianza.
- La IA puede equivocarse. Los resúmenes no reemplazan la opinión médica; siempre se puede ver el documento original y corregir los datos.

---

## Detalles técnicos

- **Next.js 15** (App Router, Server Actions) + **Tailwind CSS 4**.
- **Supabase**: Postgres con Row Level Security, Storage (bucket privado `documentos`, rutas `<family_id>/<document_id>/<archivo>`; las hojas de cada estudio están en la tabla `document_files`), Auth con email y contraseña.
- **IA**: `src/lib/ai.ts` envía todas las hojas del estudio (imágenes y/o PDF, en orden) en un solo pedido a la Messages API, con salida estructurada (Zod) y la lista de integrantes y médicos para que asigne el documento. Usa `fallbacks: "default"` para que, si el modelo rechaza un documento por un falso positivo de seguridad, la API reintente con otro modelo.
- Las fotos se achican en el navegador antes de subirse (máx. 2200 px, JPEG).

Para correrla localmente:

```bash
cp .env.example .env.local   # completar los valores
npm install
npm run dev                  # http://localhost:3000
```
