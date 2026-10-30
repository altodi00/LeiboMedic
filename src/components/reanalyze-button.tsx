"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReanalyzeButton({ documentId, label = "Volver a analizar con IA" }: { documentId: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo analizar");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={run} disabled={loading} className="btn-secondary">
        {loading ? "Analizando… (puede tardar hasta un minuto)" : label}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
