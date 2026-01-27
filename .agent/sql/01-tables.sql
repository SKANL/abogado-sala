-- 01-tables.sql
-- Core Table Definitions

-- 1. Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier plan_tier not null default 'trial',
  plan_status plan_status not null default 'active',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- 2. Profiles (Linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id),
  role user_role not null default 'member',
  full_name text,
  avatar_url text,
  assigned_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  assigned_lawyer_id uuid references profiles(id), -- Nullable if unassigned initially? Assuming optional assignment.
  full_name text not null,
  email text,
  phone text,
  status client_status not null default 'prospect',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Cases (Salas)
create table cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  org_id uuid not null references organizations(id),
  template_snapshot jsonb not null default '{}'::jsonb,
  current_step_index int not null default 0,
  token text not null unique,
  status case_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Case Files
create table case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  org_id uuid not null references organizations(id),
  file_key text, -- Path in Storage
  category text not null, -- "DNI", "Contrato", etc.
  status file_status not null default 'pending',
  exception_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Templates
create table templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  title text not null,
  schema jsonb not null default '{}'::jsonb,
  scope template_scope not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Audit Logs (Immutable)
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  actor_id uuid references auth.users(id), -- Can be null if system action? Keeping basic FK.
  action text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
