-- ============================================================
-- 01-enums.sql
-- Tipos ENUM del proyecto abogado-sala
-- Ejecutar DESPUÉS de 00-extensions.sql
-- ============================================================

-- Rol de usuario dentro de una organización
CREATE TYPE public.user_role AS ENUM ('admin', 'member', 'owner');

-- Estado del usuario/miembro
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'archived');

-- Tier del plan de facturación
CREATE TYPE public.plan_tier AS ENUM ('trial', 'pro', 'enterprise', 'demo');

-- Estado del plan de facturación
CREATE TYPE public.plan_status AS ENUM (
  'active', 'trialing', 'past_due', 'canceled', 'paused', 'expired'
);

-- Estado de suscripción Stripe
CREATE TYPE public.subscription_status AS ENUM (
  'active', 'past_due', 'canceled', 'incomplete',
  'incomplete_expired', 'trialing', 'unpaid'
);

-- Estado del cliente
CREATE TYPE public.client_status AS ENUM ('prospect', 'active', 'archived');

-- Estado del expediente/caso
CREATE TYPE public.case_status AS ENUM (
  'draft', 'in_progress', 'review', 'completed', 'archived'
);

-- Estado de archivos del caso
CREATE TYPE public.file_status AS ENUM (
  'pending', 'uploaded', 'error', 'approved', 'rejected'
);

-- Scope de plantillas
CREATE TYPE public.template_scope AS ENUM ('private', 'global');

-- Estado de invitación
CREATE TYPE public.invitation_status AS ENUM (
  'pending', 'accepted', 'expired', 'revoked'
);
