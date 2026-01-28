-- 02-indexes.sql
-- Performance Indexes & Foreign Key Indexes

-- 1. Profiles
create index profiles_org_id_idx on profiles(org_id);

-- 2. Clients
create index clients_org_id_idx on clients(org_id);
create index clients_assigned_lawyer_id_idx on clients(assigned_lawyer_id);
-- Compound for common lookup: All clients for a lawyer in an org (though RLS handles security, index helps speed)
create index clients_org_lawyer_idx on clients(org_id, assigned_lawyer_id);
-- Fuzzy search for name
create index clients_name_trgm_idx on clients using gist (full_name gist_trgm_ops);

-- 3. Cases
create index cases_client_id_idx on cases(client_id);
create index cases_org_id_idx on cases(org_id);
create index cases_token_idx on cases(token); -- Critical for public portal access

-- 4. Case Files
create index case_files_case_id_idx on case_files(case_id);
create index case_files_org_id_idx on case_files(org_id);

-- 5. Templates
create index templates_org_id_idx on templates(org_id);
create index templates_owner_id_idx on templates(owner_id);

-- 6. Audit Logs
create index audit_logs_org_id_created_at_idx on audit_logs(org_id, created_at desc);
create index audit_logs_target_id_idx on audit_logs(target_id);

-- 7. Invitations
create index invitations_email_idx on invitations(email);

-- 8. Portal Analytics
create index portal_analytics_case_id_idx on portal_analytics(case_id);
create index portal_analytics_created_at_idx on portal_analytics(created_at desc);

-- 9. Notifications
create index notifications_user_read_idx on notifications(user_id, read) where read = false; -- Target unread counts
create index notifications_org_id_idx on notifications(org_id);
