import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Devuelve el cliente, el usuario y su familia. Redirige si falta algo. */
export async function requireFamily() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("family_users")
    .select("family_id, families(id, name, invite_code)")
    .eq("user_id", user.id)
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/bienvenida");

  const family = membership.families as unknown as { id: string; name: string; invite_code: string };
  return { supabase, user, family };
}
