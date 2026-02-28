import { cn } from "@/lib/utils";

interface FormFieldErrorProps {
  message?: string | null;
  className?: string;
}

/**
 * Componente de error de campo de formulario accesible.
 * Usa role="alert" + aria-live="polite" para lectores de pantalla.
 */
export function FormFieldError({ message, className }: FormFieldErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn("text-sm text-destructive", className)}
    >
      {message}
    </p>
  );
}
