"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: "Email o contraseña incorrectos." });
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    if (data.session) {
      router.replace("/bienvenida");
      router.refresh();
    } else {
      setMessage({ type: "info", text: "Te mandamos un email para confirmar la cuenta. Abrí el link y volvé a entrar." });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-bold text-white">+</div>
          <h1 className="text-2xl font-bold">LeiboMedic</h1>
          <p className="mt-1 text-sm text-slate-500">La información médica de toda la familia, en un solo lugar.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold">{mode === "login" ? "Entrar" : "Crear cuenta"}</h2>
          <label className="block">
            <span className="label">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="label">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {message && (
            <p className={`rounded-lg p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-900"}`}>
              {message.text}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage(null);
            }}
            className="w-full text-center text-sm text-brand-700 hover:underline"
          >
            {mode === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Entrá"}
          </button>
        </form>
      </div>
    </main>
  );
}
