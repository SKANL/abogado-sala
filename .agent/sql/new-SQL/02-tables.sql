-- ============================================================
-- 02-tables.sql
-- Tablas principales del proyecto abogado-sala
-- Ejecutar DESPUÉS de 01-enums.sql
-- ============================================================

-- ── organizations ─────────────────────────────────────────────
CREATE TABLE public.organizations (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text          NOT NULL,
  slug                    text          UNIQUE NOT NULL,
  plan_tier               public.plan_tier    NOT NULL DEFAULT 'trial',
  plan_status             public.plan_status  NOT NULL DEFAULT 'active',
  stripe_customer_id      text          UNIQUE,
  trial_ends_at           timestamptz,
  storage_used            bigint        NOT NULL DEFAULT 0 CHECK (storage_used >= 0),
  logo_url                text,
  primary_color           text          DEFAULT '#18181b',
  created_at              timestamptz   NOT NULL DEFAULT now(),
  consent_text            text,
  members_can_see_all_cases    boolean  NOT NULL DEFAULT false,
  members_can_see_all_clients  boolean  NOT NULL DEFAULT false,
  whatsapp_template       text DEFAULT 'Hola {client_name} 👋, te compartimos el enlace para acceder a tu expediente en el portal de *{org_name}*:

{link}

Por favor revisa los documentos y completa la información solicitada. ¡Estamos para apoyarte!'
);

-- ── plan_configs ───────────────────────────────────────────────
CREATE TABLE public.plan_configs (
  plan              public.plan_tier  PRIMARY KEY,
  max_clients       integer           NOT NULL,
  max_admins        integer           NOT NULL,
  max_storage_bytes bigint            NOT NULL,
  can_white_label   boolean           NOT NULL DEFAULT false
);

-- Datos iniciales de configuración de planes
INSERT INTO public.plan_configs (plan, max_clients, max_admins, max_storage_bytes, can_white_label) VALUES
  ('trial',      5,    1,   104857600,  false),   -- 100 MB
  ('pro',        100,  5,   1073741824, false),   -- 1 GB
  ('enterprise', 9999, 99,  10737418240,true),    -- 10 GB
  ('demo',       50,   10,  536870912,  true);    -- 512 MB

-- ── profiles ──────────────────────────────────────────────────
-- Extiende auth.users con datos de perfil y rol organizacional
CREATE TABLE public.profiles (
  id              uuid              PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          uuid              REFERENCES public.organizations(id) ON DELETE SET NULL,
  role            public.user_role  NOT NULL DEFAULT 'member',
  status          public.user_status NOT NULL DEFAULT 'active',
  full_name       text,
  avatar_url      text,
  assigned_phone  text,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now()
);

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                      uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid                       NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id  text                       UNIQUE,
  stripe_price_id         text,
  status                  public.subscription_status NOT NULL,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at               timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz                NOT NULL DEFAULT now(),
  updated_at              timestamptz                NOT NULL DEFAULT now()
);

-- ── invitations ───────────────────────────────────────────────
CREATE TABLE public.invitations (
  id          uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid                      NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       text                      NOT NULL,
  role        public.user_role          NOT NULL DEFAULT 'member',
  token       text                      UNIQUE NOT NULL,
  invited_by  uuid                      REFERENCES public.profiles(id) ON DELETE SET NULL,
  status      public.invitation_status  NOT NULL DEFAULT 'pending',
  expires_at  timestamptz               NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz               NOT NULL DEFAULT now()
);

-- ── clients ───────────────────────────────────────────────────
CREATE TABLE public.clients (
  id                  uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid                 NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_lawyer_id  uuid                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name           text                 NOT NULL,
  email               text,
  phone               text,
  status              public.client_status NOT NULL DEFAULT 'prospect',
  created_at          timestamptz          NOT NULL DEFAULT now(),
  updated_at          timestamptz          NOT NULL DEFAULT now(),
  auth_user_id        uuid                 UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (org_id, email)
);

-- ── templates ─────────────────────────────────────────────────
CREATE TABLE public.templates (
  id         uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid                   NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id   uuid                   REFERENCES public.profiles(id) ON DELETE SET NULL,
  title      text                   NOT NULL,
  schema     jsonb                  NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(schema) = 'object'),
  scope      public.template_scope  NOT NULL DEFAULT 'private',
  created_at timestamptz            NOT NULL DEFAULT now(),
  updated_at timestamptz            NOT NULL DEFAULT now()
);

-- ── cases ─────────────────────────────────────────────────────
CREATE TABLE public.cases (
  id                    uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid               NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  org_id                uuid               NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id           uuid               REFERENCES public.templates(id) ON DELETE SET NULL,
  template_snapshot     jsonb              NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(template_snapshot) = 'object'),
  questionnaire_answers jsonb              DEFAULT '{}',
  current_step_index    integer            NOT NULL DEFAULT 0 CHECK (current_step_index >= 0),
  token                 text               UNIQUE NOT NULL,
  status                public.case_status NOT NULL DEFAULT 'draft',
  expires_at            timestamptz        NOT NULL DEFAULT (now() + interval '30 days'),
  assigned_to           uuid               REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by            uuid               REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz        NOT NULL DEFAULT now(),
  updated_at            timestamptz        NOT NULL DEFAULT now()
);

-- ── case_files ────────────────────────────────────────────────
CREATE TABLE public.case_files (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          uuid              NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id           uuid              NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_key         text,
  file_size        bigint            NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  category         text              NOT NULL CHECK (category = ANY (ARRAY[
    'DNI', 'Contrato', 'Escritura', 'Poder', 'Otro', 'Factura', 'Sentencia'
  ])),
  status           public.file_status NOT NULL DEFAULT 'pending',
  exception_reason text,
  description      text,
  review_note      text,
  reviewed_by      uuid              REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz       NOT NULL DEFAULT now(),
  updated_at       timestamptz       NOT NULL DEFAULT now()
);

-- ── case_notes ────────────────────────────────────────────────
CREATE TABLE public.case_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── case_updates ──────────────────────────────────────────────
-- Actualizaciones/hitos visibles en el portal del cliente
CREATE TABLE public.case_updates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL,
  author_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title      text        NOT NULL,
  body       text,
  type       text        NOT NULL DEFAULT 'info' CHECK (type = ANY (ARRAY[
    'info', 'milestone', 'warning', 'document_request'
  ])),
  created_at timestamptz DEFAULT now()
);

-- ── audit_logs ────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  target_id  uuid,
  metadata   jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  message    text        NOT NULL,
  type       text        NOT NULL CHECK (type = ANY (ARRAY['info', 'warning', 'success', 'error'])),
  read       boolean     NOT NULL DEFAULT false,
  metadata   jsonb       DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── portal_analytics ──────────────────────────────────────────
CREATE TABLE public.portal_analytics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type = ANY (ARRAY[
    'view', 'download', 'print', 'complete', 'exception'
  ])),
  step_index  integer,
  metadata    jsonb       DEFAULT '{}',
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── jobs ──────────────────────────────────────────────────────
-- Jobs async (e.g., exportación zip de expedientes)
CREATE TABLE public.jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  type          text        NOT NULL CHECK (type = ANY (ARRAY['zip_export', 'report_gen'])),
  status        text        NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending', 'processing', 'completed', 'failed'
  ])),
  result_url    text,
  error_message text,
  metadata      jsonb       DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── tasks ─────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id      uuid        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
  description  text,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending', 'in_progress', 'completed', 'cancelled'
  ])),
  priority     text        NOT NULL DEFAULT 'medium' CHECK (priority = ANY (ARRAY[
    'low', 'medium', 'high', 'urgent'
  ])),
  assigned_to  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     date,
  completed_at timestamptz,
  completed_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── deletion_requests ─────────────────────────────────────────
-- Solicitudes de eliminación GDPR / flujo de aprobación
CREATE TABLE public.deletion_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL CHECK (entity_type = ANY (ARRAY['case', 'client'])),
  entity_id    uuid        NOT NULL,
  entity_label text        NOT NULL,
  reason       text,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending', 'approved', 'rejected'
  ])),
  reviewed_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── storage_delete_queue ──────────────────────────────────────
-- Cola de eliminación física de archivos en Storage
CREATE TABLE public.storage_delete_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id    text        NOT NULL,
  file_path    text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending', 'processing', 'completed', 'failed'
  ])),
  retry_count  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- ── rate_limits ───────────────────────────────────────────────
-- Token bucket para limitar llamadas a RPCs costosas
CREATE TABLE public.rate_limits (
  key         text        PRIMARY KEY,
  tokens      integer     NOT NULL,
  last_refill timestamptz NOT NULL DEFAULT now()
);
