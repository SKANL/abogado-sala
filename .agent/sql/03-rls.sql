-- 03-rls.sql
-- Row Level Security Policies
-- Default: Deny All active implied by 'enable row level security' without policies

-- 1. Enable RLS on All Tables
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table cases enable row level security;
alter table case_files enable row level security;
alter table templates enable row level security;
alter table audit_logs enable row level security;

-- 2. Organizations Policies
create policy "Users can view their own organization"
  on organizations for select
  using (id = auth.org_id());

create policy "Authenticated users insert organizations"
  on organizations for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update their organization"
  on organizations for update
  using (id = auth.org_id() and auth.is_admin());

-- 3. Profiles Policies
create policy "Users can view profiles in their organization"
  on profiles for select
  using (org_id = auth.org_id());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

create policy "Admins can update any profile in their organization"
  on profiles for update
  using (org_id = auth.org_id() and auth.is_admin());

create policy "Users can insert their own profile"
  on profiles for insert
  with check (id = auth.uid());

-- 4. Clients Policies
-- Admin sees all in Org. Member sees only assigned.
-- Fix: Split `for all` into explicit policies (using() doesn't apply to INSERT)

create policy "Select Clients"
  on clients for select
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    (assigned_lawyer_id = auth.uid())
  );

create policy "Update Clients"
  on clients for update
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    (assigned_lawyer_id = auth.uid())
  );

create policy "Delete Clients"
  on clients for delete
  using (
    auth.is_admin() and org_id = auth.org_id()
  );

create policy "Members can insert clients"
  on clients for insert
  with check (
    org_id = auth.org_id()
  );

-- 5. Cases Policies
-- Inherits logic from Clients essentially, but direct check for speed (denormalized org_id)
-- Fix: Split `for all` into explicit policies

create policy "Select Cases"
  on cases for select
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    exists (
      select 1 from clients 
      where clients.id = cases.client_id 
      and clients.assigned_lawyer_id = auth.uid()
    )
  );

create policy "Update Cases"
  on cases for update
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    exists (
      select 1 from clients 
      where clients.id = cases.client_id 
      and clients.assigned_lawyer_id = auth.uid()
    )
  );

create policy "Delete Cases"
  on cases for delete
  using (
    auth.is_admin() and org_id = auth.org_id()
  );

create policy "Insert Cases"
  on cases for insert
  with check (
    org_id = auth.org_id()
    and
    (
      auth.is_admin() 
      or 
      exists (
        select 1 from clients 
        where clients.id = cases.client_id 
        and clients.assigned_lawyer_id = auth.uid()
      )
    )
  );
  
-- 6. Case Files Policies
-- Access if user has access to the Case.
create policy "Access Case Files"
  on case_files for select using (
    (auth.is_admin() and org_id = auth.org_id()) -- Fast Path for Admins (Avoid Joins)
    or
    exists (
      select 1 from cases
      where cases.id = case_files.case_id
      and (
        -- Admin check redundant here due to fast path above, keeping for safety fallback
        (auth.is_admin() and cases.org_id = auth.org_id()) 
        or
        exists (
            select 1 from clients
            where clients.id = cases.client_id
            and clients.assigned_lawyer_id = auth.uid()
        )
      )
    )
  );

-- Fix: Missing INSERT policy for case_files (would block uploads)
create policy "Insert Case Files"
  on case_files for insert
  with check (
    org_id = auth.org_id()
    and exists (
      select 1 from cases
      where cases.id = case_files.case_id
      and cases.org_id = auth.org_id()
    )
  );

-- Fix: Allow UPDATE on case_files (for confirmUploadAction)
create policy "Update Case Files"
  on case_files for update
  using (
    exists (
      select 1 from cases
      where cases.id = case_files.case_id
      and (
        (auth.is_admin() and cases.org_id = auth.org_id())
        or exists (
          select 1 from clients
          where clients.id = cases.client_id
          and clients.assigned_lawyer_id = auth.uid()
        )
      )
    )
  );

-- Fix: Allow DELETE on case_files (for cleanup)
create policy "Delete Case Files"
  on case_files for delete
  using (
    exists (
      select 1 from cases
      where cases.id = case_files.case_id
      and (
        (auth.is_admin() and cases.org_id = auth.org_id())
        or exists (
          select 1 from clients
          where clients.id = cases.client_id
          and clients.assigned_lawyer_id = auth.uid()
        )
      )
    )
  );

-- 7. Templates Policies
-- Global: Read (All), Write (Admin). Private: Full (Owner)

-- Split Policies to avoid recursion/overlap
create policy "Select Templates"
  on templates for select
  using (
    (scope = 'global' and org_id = auth.org_id())
    or
    (owner_id = auth.uid())
  );

create policy "Insert Templates"
  on templates for insert
  with check (owner_id = auth.uid() and org_id = auth.org_id());

create policy "Update Templates"
  on templates for update
  using (owner_id = auth.uid());

create policy "Delete Templates"
  on templates for delete
  using (owner_id = auth.uid());


-- 8. Audit Logs
-- View Only (Admin usually, or maybe all members depending on requirement? Letting Admin only for now)
create policy "Admins view audit logs"
  on audit_logs for select
  using (org_id = auth.org_id() and auth.is_admin());

-- Fix: H4. Members see their own logs
create policy "Members view own logs"
  on audit_logs for select
  using (actor_id = auth.uid());

-- 9. Invitations Policies
alter table invitations enable row level security;

create policy "Admins view and manage invitations"
  on invitations for all
  using (org_id = auth.org_id() and auth.is_admin());

-- 10. Subscriptions Policies
alter table subscriptions enable row level security;

create policy "Admins view subscriptions"
  on subscriptions for select
  using (org_id = auth.org_id() and auth.is_admin());

-- 11. Portal Analytics Policies
alter table portal_analytics enable row level security;

-- Allow Anon/Auth to insert analytics (logging)
create policy "Public insert portal analytics"
  on portal_analytics for insert
  with check (
    -- Anti-Spam: Must reference a valid case
    exists (select 1 from cases where id = case_id)
  );

-- Fix: C5. Falta política SELECT para `portal_analytics`
create policy "Admins view portal analytics"
  on portal_analytics for select
  using (
    exists (
      select 1 from cases
      where cases.id = portal_analytics.case_id
      and cases.org_id = auth.org_id()
      and auth.is_admin()
    )
  );

-- 12. Storage Delete Queue
alter table storage_delete_queue enable row level security;
-- No policies = Deny All (System/Service Role only via Triggers)

-- 13. Plan Configs (New)
alter table plan_configs enable row level security;

create policy "Authenticated read plan configs"
  on plan_configs for select
  using (auth.role() = 'authenticated');

-- 14. Notifications (New)
alter table notifications enable row level security;

create policy "Users view own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users update own notifications (mark read)"
  on notifications for update
  using (user_id = auth.uid());
  
-- INSERT Denied for users (System-only via Triggers)

-- 15. Rate Limits (System-Only Table)
-- Already has RLS enabled in 01-tables.sql
-- No policies = Deny all (only security definer functions can access)

