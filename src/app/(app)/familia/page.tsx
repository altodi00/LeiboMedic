import { renameFamily, signOut } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { PageHeader } from "@/components/ui";
import { requireFamily } from "@/lib/family";

export default async function FamilyPage() {
  const { supabase, family, user } = await requireFamily();
  const { data: members } = await supabase.from("family_users").select("user_id, email, joined_at").eq("family_id", family.id).order("joined_at");

  return (
    <>
      <PageHeader title="Familia" subtitle="Quiénes tienen acceso y cómo invitar a otros." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Invitar a alguien</h2>
          <p className="mt-1 text-sm text-slate-600">
            Para que otra persona (por ejemplo tu pareja) vea y cargue información, que cree su cuenta en esta misma página y, cuando se lo pida, ingrese
            este código:
          </p>
          <p className="mt-4 select-all rounded-xl bg-brand-50 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-brand-700">
            {family.invite_code}
          </p>
          <p className="mt-3 text-xs text-slate-500">Cualquiera con el código puede ver toda la información médica de la familia. Compartilo solo con gente de confianza.</p>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Cuentas con acceso</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="py-2">
                {m.email ?? "Usuario"} {m.user_id === user.id && <span className="text-slate-400">(vos)</span>}
              </li>
            ))}
          </ul>
        </div>

        <form action={renameFamily} className="card space-y-3">
          <h2 className="font-semibold">Nombre del grupo</h2>
          <input name="name" defaultValue={family.name} required className="input" />
          <SubmitButton>Guardar</SubmitButton>
        </form>

        <form action={signOut} className="card">
          <h2 className="font-semibold">Sesión</h2>
          <p className="mb-3 mt-1 text-sm text-slate-600">Entraste como {user.email}.</p>
          <button className="btn-secondary">Cerrar sesión</button>
        </form>
      </div>
    </>
  );
}
