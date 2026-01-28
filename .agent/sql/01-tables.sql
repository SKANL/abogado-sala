-- 01-tables.sql
-- Core Table Definitions
-- NOTE: All ENUMs are defined in 00-init.sql (single source of truth)

-- 1. Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier plan_tier not null default 'trial',
  plan_status plan_status not null default 'active',
  stripe_customer_id text unique, -- Enforced 1:1 mapping
  trial_ends_at timestamptz, -- Missing in audit: Track trial expiration explicitly
  storage_used bigint not null default 0 check (storage_used >= 0), -- Track total bytes used
  logo_url text, -- White Labeling
  primary_color text default '#18181b', -- Brand Color default zinc-950
  created_at timestamptz not null default now()
);

-- 2. Profiles (Linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade, -- Fix: Clean Org Deletion
  role user_role not null default 'member',
  status user_status not null default 'active', -- Support for removeMemberAction (Soft Delete)
  full_name text,
  avatar_url text,
  assigned_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade, -- Fix: Clean Org Deletion
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
  client_id uuid not null references clients(id) on delete restrict, -- Safety: Prevent accidental wipe of legal history
  org_id uuid not null references organizations(id) on delete cascade, -- Fix: Clean Org Deletion
  template_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(template_snapshot) = 'object'), -- Fix: Ensure Valid Object
  current_step_index int not null default 0 check (current_step_index >= 0), -- Fix: Prevent negative steps
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
  file_size bigint not null default 0 check (file_size >= 0), -- Fix: Prevent negative sizes
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
  owner_id uuid references profiles(id) on delete set null, -- Audit Fix: Prevent orphan crash
  title text not null,
  schema jsonb not null default '{}'::jsonb check (jsonb_typeof(schema) = 'object'), -- Fix: Ensure Valid Object
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

-- 8. Invitations
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

-- 9. Subscriptions (Stripe History)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status subscription_status not null, -- Fixed: now is enum
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

-- 12. Plan Configs (New - Audit H2)
create table plan_configs (
  plan plan_tier primary key,
  max_clients int not null,
  max_admins int not null,
  max_storage_bytes bigint not null,
  can_white_label boolean not null default false
);

insert into plan_configs (plan, max_clients, max_admins, max_storage_bytes, can_white_label) values
  ('trial', 10, 1, 524288000, false),        -- 500MB
  ('pro', 1000, 5, 53687091200, true),       -- 50GB
  ('enterprise', 10000, 50, 536870912000, true), -- 500GB (Fix: Missing seed)
  ('demo', 25, 2, 1073741824, false);        -- 1GB (Fix: Missing seed for beta testers)

-- 13. Notifications (New - Audit H3)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null, -- 'info', 'warning', 'success', 'error'
  read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 14. Async Jobs (Zip Generation, Reports)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  requester_id uuid references profiles(id) on delete set null,
  type text not null, -- 'zip_export', 'report_gen'
  status text not null default 'pending', -- pending, processing, completed, failed
  result_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
