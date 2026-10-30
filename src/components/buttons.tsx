"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Botón que pide confirmación antes de ejecutar una acción (ej: borrar). */
export function ConfirmButton({
  action,
  children,
  message = "¿Seguro que querés borrarlo? No se puede deshacer.",
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <SubmitButton className={className} pendingText="…">
        {children}
      </SubmitButton>
    </form>
  );
}
