import { redirect } from "next/navigation";
import { createFamily, joinFamily, signOut } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("family_users").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (count && count > 0) redirect("/");

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">¡Bienvenido/a!</h1>
      <p className="mt-1 text-slate-600">Para empezar, creá el grupo familiar o sumate a uno que ya exista.</p>

      <form action={createFamily} className="card mt-6 space-y-3">
        <h2 className="font-semibold">Crear un grupo familiar nuevo</h2>
        <input name="name" required placeholder="Ej: Familia Leibovich" className="input" />
        <SubmitButton pendingText="Creando…">Crear</SubmitButton>
      </form>

      <form action={joinFamily} className="card mt-4 space-y-3">
        <h2 className="font-semibold">Sumarme con un código de invitación</h2>
        <p className="text-sm text-slate-500">Pedile el código a quien ya creó la familia (lo encuentra en la sección “Familia”).</p>
        <input name="code" required placeholder="Ej: 7F3A9C21" className="input uppercase" />
        {error && <p className="text-sm text-red-600">El código no es válido. Revisalo e intentá de nuevo.</p>}
        <SubmitButton className="btn-secondary" pendingText="Uniéndome…">
          Unirme
        </SubmitButton>
      </form>

      <form action={signOut} className="mt-6 text-center">
        <button className="text-sm text-slate-500 hover:underline">Salir ({user.email})</button>
      </form>
    </main>
  );
}
