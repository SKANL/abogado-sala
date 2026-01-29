import { z } from "zod";

// Shared Enums (Integrity Constraints)
export const FileCategoryEnum = z.enum([
  "DNI",
  "Contrato",
  "Escritura",
  "Poder",
  "Otro",
  "Factura",
  "Sentencia",
]);

export const PortalEventEnum = z.enum([
  "view",
  "download",
  "print",
  "complete",
  "exception",
]);

// Schemas
export const insertClientSchema = z.object({
  full_name: z.string().min(2, "Nombre requerido").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  assigned_lawyer_id: z.string().uuid().optional(), // Nullable en DB
  status: z.enum(["prospect", "active", "archived"]).default("prospect"),
});

export const updateClientSchema = insertClientSchema.partial().extend({
  id: z.string().uuid(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member"]).default("member"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  primary_color: z.string().optional(),
  logo_url: z.string().optional(),
});

export const createCaseSchema = z.object({
  client_id: z.string().uuid({ message: "Cliente requerido" }),
  template_snapshot: z.record(z.string(), z.any()).optional(), // JSONB. WARNING: Must validate against FileCategoryEnum
  status: z.enum(["draft", "in_progress"]).default("draft"),
});

export const updateCaseSchema = z.object({
  case_id: z.string().uuid(),
  status: z.enum(["draft", "in_progress", "review", "completed", "archived"]),
  current_step_index: z.number().int().min(0).optional(),
});

// Templates Schemas
export const templateScopeEnum = z.enum(["private", "global"]);

export const createTemplateSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  schema: z.record(z.string(), z.any()).default({}), // The JSON schema for the form builder
  scope: templateScopeEnum.default("private"),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Nombre requerido").optional(),
  avatar_url: z.string().optional(),
});

export const revokeInvitationSchema = z.object({
  id: z.string().uuid(),
});

export const notificationActionSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export const jobRequestSchema = z.object({
  case_id: z.string().uuid(),
  type: z.enum(["zip_export", "report_gen"]),
});

export const stripeCheckoutSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
});


