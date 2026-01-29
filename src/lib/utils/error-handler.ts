import { Result } from "@/types";
import { ZodError } from "zod";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Standard error codes as defined in backend/backend-contracts.md and backend/error-dictionary.md
 */
export const ERROR_CODES = {
  // Authentication & Integrity
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_ORG_MISMATCH: "AUTH_ORG_MISMATCH",
  AUTH_ZOMBIE_TOKEN: "AUTH_ZOMBIE_TOKEN",
  AUTH_SUSPENDED: "AUTH_SUSPENDED",
  AUTH_LAST_ADMIN: "AUTH_LAST_ADMIN",

  // Billing & Quotas
  BILLING_QUOTA_CLIENTS: "BILLING_QUOTA_CLIENTS",
  BILLING_QUOTA_STORAGE: "BILLING_QUOTA_STORAGE",
  BILLING_SUBSCRIPTION_INACTIVE: "BILLING_SUBSCRIPTION_INACTIVE",
  BILLING_PAST_DUE: "BILLING_PAST_DUE",
  BILLING_TRIAL_EXPIRED: "BILLING_TRIAL_EXPIRED",
  BILLING_DOWNGRADE_BLOCK: "BILLING_DOWNGRADE_BLOCK",

  // Validation & Logic
  VAL_INVALID_INPUT: "VAL_INVALID_INPUT",
  VAL_DUPLICATE_SLUG: "VAL_DUPLICATE_SLUG",
  VAL_TOKEN_USED: "VAL_TOKEN_USED",
  VAL_NOT_FOUND: "VAL_NOT_FOUND",
  VAL_DEPENDENCY_EXISTS: "VAL_DEPENDENCY_EXISTS",

  // System & Infrastructure
  SYS_INTERNAL_ERROR: "SYS_INTERNAL_ERROR",
  SYS_RATE_LIMIT: "SYS_RATE_LIMIT",
  SYS_STORAGE_UPLOAD_FAIL: "SYS_STORAGE_UPLOAD_FAIL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function handleError(error: unknown): Result<never> {
  console.error("Action Error:", error);

  // 1. Zod Validation Errors
  if (error instanceof ZodError) {
    return {
      success: false,
      error: "Error de validación",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // 2. Supabase / Postgres Errors
  if (isPostgrestError(error)) {
    return handlePostgrestError(error);
  }

  // 3. Known Error Objects (e.g. from Custom Exceptions)
  if (error instanceof Error) {
    // Check if the error message matches a known code straight away (e.g. thrown manually)
    if (Object.values(ERROR_CODES).includes(error.message as ErrorCode)) {
      return {
        success: false,
        error: mapErrorCodeToMessage(error.message as ErrorCode),
        code: error.message,
      };
    }
    // Check if message contains a known code (often contained in Postgres error messages)
    for (const code of Object.values(ERROR_CODES)) {
        if (error.message.includes(code)) {
            return {
                success: false,
                error: mapErrorCodeToMessage(code as ErrorCode),
                code: code
            }
        }
    }
  }

  // 4. Default / Unhandled
  return {
    success: false,
    error: "Ocurrió un error inesperado",
    code: ERROR_CODES.SYS_INTERNAL_ERROR,
  };
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "details" in error
  );
}

function handlePostgrestError(error: PostgrestError): Result<never> {
  // Handle Custom Postgres Exceptions (raised via RAISE EXCEPTION using internal error codes or messages)
  // Our triggers use 'message' field for the error code often.
  for (const code of Object.values(ERROR_CODES)) {
    if (error.message.includes(code)) {
        return {
            success: false,
            error: mapErrorCodeToMessage(code as ErrorCode),
            code: code
        }
    }
  }

  // Handle Standard Postgres Codes
  switch (error.code) {
    case "23505": // Unique violation
    case "P2002":
      return {
        success: false,
        error: "Ya existe un registro con estos datos",
        code: ERROR_CODES.VAL_DUPLICATE_SLUG,
      };
    case "23503": // Foreign key violation
    case "P23503":
      return {
        success: false,
        error: "No se puede eliminar: tiene registros asociados",
        code: ERROR_CODES.VAL_DEPENDENCY_EXISTS,
      };
    case "P2025":
    case "42704": // Undefined object (sometimes happens if resource missing)
       return {
        success: false,
        error: "Registro no encontrado",
        code: ERROR_CODES.VAL_NOT_FOUND,
       }
    default:
      return {
        success: false,
        error: error.message || "Error de base de datos",
        code: ERROR_CODES.SYS_INTERNAL_ERROR,
      };
  }
}

function mapErrorCodeToMessage(code: ErrorCode): string {
  switch (code) {
    case ERROR_CODES.AUTH_UNAUTHORIZED:
      return "Tu sesión ha expirado";
    case ERROR_CODES.AUTH_FORBIDDEN:
      return "No tienes permiso para ver esto";
    case ERROR_CODES.AUTH_ORG_MISMATCH:
      return "Acceso denegado a este recurso";
    case ERROR_CODES.AUTH_ZOMBIE_TOKEN:
      return "Cuenta deshabilitada";
    case ERROR_CODES.AUTH_SUSPENDED:
      return "Cuenta suspendida temporalmente";
    case ERROR_CODES.AUTH_LAST_ADMIN:
       return "No puedes eliminar el último admin";
    case ERROR_CODES.BILLING_QUOTA_CLIENTS:
      return "Has alcanzado el límite de clientes de tu plan";
    case ERROR_CODES.BILLING_QUOTA_STORAGE:
      return "Espacio de almacenamiento lleno (5GB)";
    case ERROR_CODES.BILLING_SUBSCRIPTION_INACTIVE:
      return "Tu suscripción no está activa";
    case ERROR_CODES.BILLING_PAST_DUE:
      return "Hay un problema con tu pago";
    case ERROR_CODES.BILLING_TRIAL_EXPIRED:
      return "Tu periodo de prueba ha finalizado";
    case ERROR_CODES.BILLING_DOWNGRADE_BLOCK:
      return "Debes reducir uso antes de bajar de plan";
    case ERROR_CODES.VAL_INVALID_INPUT:
      return "Error de validación";
    case ERROR_CODES.VAL_DUPLICATE_SLUG:
      return "Este nombre de URL ya existe";
    case ERROR_CODES.VAL_TOKEN_USED:
      return "Este trámite ya fue completado";
    case ERROR_CODES.VAL_NOT_FOUND:
        return "Registro no encontrado";
    case ERROR_CODES.VAL_DEPENDENCY_EXISTS:
        return "No se puede realizar esta acción porque existen registros dependientes";
    case ERROR_CODES.SYS_RATE_LIMIT:
      return "Demasiados intentos, espera un momento";
    case ERROR_CODES.SYS_STORAGE_UPLOAD_FAIL:
      return "Error al subir documento";
    default:
      return "Ocurrió un error inesperado";
  }
}
