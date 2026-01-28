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

-- 4. Clients Policies
-- Admin sees all in Org. Member sees only assigned.
create policy "Access Clients"
  on clients for all
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    (assigned_lawyer_id = auth.uid())
  );

create policy "Members can insert clients"
  on clients for insert
  with check (
    org_id = auth.org_id()
  );

-- 5. Cases Policies
-- Inherits logic from Clients essentially, but direct check for speed (denormalized org_id)
-- Using same logic: Admin sees all in Org, Member sees assigned clients' cases.
-- NOTE: We need to JOIN to check assignment if we only checked case table, 
-- but we have org_id on Case. For assignment check, we'd need to know if the client is assigned.
-- However, strict requirement was: "User Level Scope". 
-- If a case belongs to a client assigned to me, I see it.
-- We can simplify by assuming if I can see the Client, I can see the Case.
create policy "Access Cases"
  on cases for all
  using (
    (auth.is_admin() and org_id = auth.org_id())
    or
    exists (
      select 1 from clients 
      where clients.id = cases.client_id 
      and clients.assigned_lawyer_id = auth.uid()
    )
  );
  
-- 6. Case Files Policies
-- Access if user has access to the Case.
create policy "Access Case Files"
  on case_files for all
  using (
    exists (
      select 1 from cases
      where cases.id = case_files.case_id
      -- Reuse Case access logic inside subquery or rely on recursive RLS?
      -- Recursive RLS can be slow. Better to duplicate the check logic or use a helper.
      and (
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
  
-- No update/delete on audit logs (Immutable by omission of policies)

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
  with check (true);

-- 12. Storage Delete Queue
alter table storage_delete_queue enable row level security;
-- No policies = Deny All (System/Service Role only via Triggers)

