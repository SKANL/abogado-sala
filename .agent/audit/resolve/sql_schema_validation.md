# 🗄️ SQL Schema Deep Dive Report

**Fecha**: 2026-01-27
**Archivos Analizados**: 5 archivos SQL (328 líneas totales)

---

## 🚨 ERRORES CRÍTICOS (Bloqueantes)

### 1. COLUMNA DUPLICADA en `clients`
- **Archivo**: `01-tables.sql` líneas 33-34
- **Código**:
    ```sql
    email text,
    email text,  -- ← DUPLICADO
    ```
- **Impacto**: ❌ **SQL NO COMPILARÁ** - Error de sintaxis
- **Solución**: Eliminar línea duplicada

---

### 2. TRIGGER COMENTADO
- **Archivo**: `04-triggers.sql` líneas 47-49
- **Código**:
    ```sql
    -- create trigger on_auth_user_created
    --   after insert on auth.users
    --   for each row execute procedure public.handle_new_user();
    ```
- **Impacto**: El perfil NO se crea automáticamente al registrar usuario
- **Consecuencia**: Sin trigger, depende 100% del Server Action. Si falla, usuario queda huérfano.
- **Decisión Requerida**: ¿Habilitar trigger o dejar lógica en código?

---

## 🔴 TABLAS FALTANTES (Mencionadas en Docs pero No Existen)

| Tabla | Mencionada En | Para Qué |
|-------|---------------|----------|
| `invitations` | auth-module.md | Sistema de invitaciones |
| `activity_logs` | realtime-strategy.md:78 | Feed de actividad (diferente de audit_logs) |
| `subscriptions` | billing-module.md | Historial de suscripciones Stripe |
| `portal_analytics` | Reporte de robustez | Métricas de uso del portal |
| `notifications` | (implícito) | Sistema de notificaciones |

### Tabla `invitations` NECESARIA:
```sql
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role user_role not null default 'member',
  token text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index invitations_token_idx on invitations(token);
create index invitations_email_idx on invitations(email);
```

---

## 🟠 CONSTRAINTS FALTANTES

### 1. `expires_at` es NULLABLE en `cases`
- **Archivo**: `01-tables.sql` línea 51
- **Código**: `expires_at timestamptz,`
- **Problema**: Sin NOT NULL, portales pueden existir para siempre
- **Solución**:
    ```sql
    expires_at timestamptz not null default (now() + interval '30 days')
    ```

### 2. Sin UNIQUE en `organizations.stripe_customer_id`
- **Archivo**: `01-tables.sql` línea 11
- **Problema**: Dos orgs podrían tener el mismo customer_id de Stripe
- **Solución**:
    ```sql
    stripe_customer_id text unique
    ```

### 3. Sin CHECK constraint en `current_step_index`
- **Archivo**: `01-tables.sql` línea 48
- **Problema**: Puede ser negativo o mayor que # de pasos
- **Solución**:
    ```sql
    current_step_index int not null default 0 check (current_step_index >= 0)
    ```

### 4. Sin LENGTH constraints en campos TEXT
- **Campos Afectados**:
    | Campo | Max Sugerido |
    |-------|--------------|
    | `organizations.name` | 100 |
    | `organizations.slug` | 50 |
    | `profiles.full_name` | 100 |
    | `clients.full_name` | 100 |
    | `templates.title` | 100 |
    | `case_files.category` | 50 |
    | `audit_logs.action` | 50 |
- **Solución**:
    ```sql
    full_name text not null check (length(full_name) <= 100)
    ```

---

## 🟡 ÍNDICES FALTANTES

### Para Queries Comunes No Indexados:

| Query Pattern | Tabla | Índice Faltante |
|---------------|-------|-----------------|
| `WHERE status = 'active'` | clients | `clients_status_idx` |
| `WHERE status = 'in_progress'` | cases | `cases_status_idx` |
| `WHERE status = 'pending'` | case_files | `case_files_status_idx` |
| `WHERE scope = 'global'` | templates | `templates_scope_idx` |
| `WHERE org_id = X ORDER BY created_at DESC` | clients | Índice compuesto faltante |
| `WHERE actor_id = X` | audit_logs | `audit_logs_actor_id_idx` (falta) |

### Índices Sugeridos:
```sql
-- Performance para filtros de status
create index clients_status_idx on clients(status);
create index cases_status_idx on cases(status);
create index case_files_status_idx on case_files(status);

-- Dashboard queries
create index clients_org_created_idx on clients(org_id, created_at desc);
create index cases_org_status_idx on cases(org_id, status);

-- Activity lookup by actor
create index audit_logs_actor_id_idx on audit_logs(actor_id);
```

---

## ⚪ FOREIGN KEY DECISIONS (Revisar)

### Ya Definidos (Correctos):
| FK | ON DELETE | ¿Correcto? |
|----|-----------|------------|
| profiles.id → auth.users | CASCADE | ✅ Sí |
| clients.org_id → organizations | (ninguno) | ⚠️ Falta |
| clients.assigned_lawyer_id → profiles | SET NULL | ✅ Sí |
| cases.client_id → clients | CASCADE | ✅ Sí |
| case_files.case_id → cases | CASCADE | ✅ Sí |
| templates.org_id → organizations | (ninguno) | ⚠️ Falta |
| audit_logs.actor_id → auth.users | SET NULL | ✅ Sí |

### FKs Sin ON DELETE (Potencial Problema):
```sql
-- Estos NO tienen ON DELETE definido:
clients.org_id references organizations(id)         -- ¿Qué pasa si borras org?
cases.org_id references organizations(id)           -- ¿Qué pasa si borras org?
case_files.org_id references organizations(id)      -- ¿Qué pasa si borras org?
templates.org_id references organizations(id)       -- ¿Qué pasa si borras org?
templates.owner_id references profiles(id)          -- ¿Qué pasa si borras profile?
audit_logs.org_id references organizations(id)      -- ¿Qué pasa si borras org?
```

### Decisión Requerida:
Si borras una `organization`, ¿qué debe pasar con sus datos?

| Opción | Comportamiento | Riesgo |
|--------|----------------|--------|
| `CASCADE` | Borra todo en cascada | Pérdida masiva de datos |
| `RESTRICT` | Bloquea la operación | Org nunca se puede borrar |
| `SET NULL` | Deja huérfanos | Data inconsistente |

**Recomendación**: Para SaaS, usar `RESTRICT` y tener proceso de "soft delete" o "archive" para orgs.

---

## 🔵 RLS POLICIES ANÁLISIS

### Policies Bien Definidas:
| Tabla | SELECT | UPDATE | INSERT | DELETE |
|-------|--------|--------|--------|--------|
| organizations | ✅ | ✅ Admin | ❌ | ❌ |
| profiles | ✅ | ✅ | ❌ | ❌ |
| clients | ✅ (for all) | ✅ | ✅ | ✅ |
| cases | ✅ (for all) | ✅ | ✅ | ✅ |
| case_files | ✅ (for all) | ✅ | ✅ | ✅ |
| templates | ✅ | ✅ | ✅ | ✅ |
| audit_logs | ✅ Admin | ❌ | ❌ | ❌ |

### Gaps Detectados:

#### 1. No hay policy para INSERT en `organizations`
- **Problema**: ¿Quién puede crear una organización?
- **Escenario**: Durante signup, ¿cómo se crea la org si RLS bloquea?
- **Solución**: Usar `security definer` en Server Action o agregar policy:
    ```sql
    create policy "Service role can create orgs"
      on organizations for insert
      to service_role
      with check (true);
    ```

#### 2. No hay policy para INSERT en `profiles`
- **Problema**: Mismo que arriba para el trigger
- **Solución**: El trigger usa `security definer`, pero si se hace desde código:
    ```sql
    create policy "Service role can create profiles"
      on profiles for insert
      to service_role
      with check (true);
    ```

#### 3. No hay policy para DELETE en `organizations`
- **Problema**: Admin no puede borrar su propia org
- **Esto puede ser intencional** (prevent accidental deletion)

#### 4. Templates: Conflicto de Policies
- `View Templates` (SELECT) y `Manage Templates` (ALL) se solapan
- **Problema**: Policy "for all" incluye SELECT, causando doble check
- **Solución**: Separar policies explícitamente
    ```sql
    drop policy "View Templates" on templates;
    drop policy "Manage Templates" on templates;
    
    create policy "Select Templates" on templates for select using (...);
    create policy "Insert Templates" on templates for insert with check (...);
    create policy "Update Templates" on templates for update using (...);
    create policy "Delete Templates" on templates for delete using (...);
    ```

---

## 🟣 ENUMS ANÁLISIS

### Definidos:
| Enum | Valores | ¿Completo? |
|------|---------|------------|
| user_role | admin, member | ⚠️ ¿Y 'owner'? |
| plan_tier | trial, pro, enterprise, demo | ✅ |
| plan_status | active, past_due, canceled | ⚠️ Falta 'trialing' |
| client_status | prospect, active, archived | ⚠️ Falta 'inactive' |
| case_status | draft, in_progress, review, completed | ⚠️ Falta 'cancelled' |
| file_status | pending, uploaded, missing, rejected | ⚠️ Falta 'approved' |
| template_scope | private, global | ✅ |

### Enums Faltantes (Basado en Documentos):
```sql
-- Para invitations
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

-- Para audit_logs (acción tipada)
create type audit_action as enum (
  'client_created', 'client_updated', 'client_deleted',
  'case_created', 'case_completed',
  'file_uploaded', 'file_rejected',
  'member_invited', 'member_removed',
  'portal_accessed', 'portal_completed'
);
```

---

## 🔶 TRIGGERS & FUNCTIONS ANÁLISIS

### `auth.org_id()` y `auth.is_admin()` - RIESGO
- **Archivo**: `00-init.sql` líneas 19-36
- **Problema Potencial**: Si `profiles` no existe para el usuario, retorna NULL
- **Consecuencia**: Usuario autenticado pero sin profile → RLS falla silenciosamente
- **Solución**: Agregar manejo de NULL
    ```sql
    create or replace function auth.org_id() 
    returns uuid 
    language sql 
    security definer 
    stable
    as $$
      select coalesce(
        (select org_id from public.profiles where id = auth.uid()),
        '00000000-0000-0000-0000-000000000000'::uuid -- Fallback UUID que no existe
      );
    $$;
    ```

### `handle_new_user()` - RIESGOS
1. **Asume org_id en metadata** (línea 30): Si no viene, INSERT falla
2. **Role casting puede fallar** (línea 31): Si metadata tiene valor inválido
3. **Trigger comentado** (línea 47-49): Depende 100% del código

---

## 📊 TABLAS FALTANTES COMPLETAS

### 1. `invitations`
```sql
create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role user_role not null default 'member',
  token text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
```

### 2. `subscriptions` (Historial Stripe)
```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3. `portal_analytics`
```sql
create table portal_analytics (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  event_type text not null,
  step_index int,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
```

---

## 📋 RESUMEN DE GAPS

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Error de sintaxis (columna duplicada) | 1 | 🔴 Bloqueante |
| Trigger deshabilitado | 1 | 🔴 Crítico |
| Tablas faltantes | 4+ | 🔴 Crítico |
| Constraints NOT NULL faltantes | 1 | 🟠 Alto |
| Constraints UNIQUE faltantes | 1 | 🟠 Alto |
| Constraints CHECK faltantes | 2 | 🟡 Medio |
| Índices faltantes | 6+ | 🟡 Medio |
| FKs sin ON DELETE | 6 | 🟡 Medio |
| RLS policies incompletas | 3 | 🟡 Medio |
| Enums incompletos | 5+ | 🟡 Bajo |

---

## ✅ ACCIONES INMEDIATAS REQUERIDAS

### 1. CRÍTICOS (Antes de Deploy)
```sql
-- Arreglar columna duplicada
-- En 01-tables.sql línea 34, eliminar la línea duplicada:
-- email text,  ← ELIMINAR

-- Hacer expires_at NOT NULL
alter table cases 
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '30 days');

-- Decidir sobre el trigger: habilitar o manejar en código
```

### 2. IMPORTANTE (Semana 1)
```sql
-- Crear tabla invitations
-- Crear índices de performance
-- Definir ON DELETE para todos los FKs
```

### 3. RECOMENDADO (Semana 2)
```sql
-- Agregar constraints CHECK y LENGTH
-- Crear tabla portal_analytics
-- Crear tabla subscriptions
```

---
