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
  storage_used bigint not null default 0, -- Track total bytes used
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
  assigned_lawyer_id uuid references profiles(id) on delete set null, -- Fix: Prevent crash on user deletion
  full_name text not null,
  email text,
  phone text,
  status client_status not null default 'prospect',
  unique(org_id, email), -- Prevent duplicate clients in same org
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
  expires_at timestamptz not null default (now() + interval '30 days'), -- Security: Hard expiration for portal access
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Case Files
create table case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  org_id uuid not null references organizations(id),
  file_key text, -- Path in Storage
  file_size bigint not null default 0, -- File size in bytes for quota tracking
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
  actor_id uuid references auth.users(id) on delete set null, -- Safety: Don't block user deletion, preserve log exists
  action text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 8. Invitations (New)
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

-- 9. Subscriptions (New - Stripe History)
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

-- 10. Portal Analytics (New)
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

-- 11. System: Storage Delete Queue (Async GC)
create table storage_delete_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  file_path text not null,
  status text not null default 'pending', -- pending, processing, completed, failed
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
