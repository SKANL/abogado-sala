


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."case_status" AS ENUM (
    'draft',
    'in_progress',
    'review',
    'completed',
    'archived'
);


ALTER TYPE "public"."case_status" OWNER TO "postgres";


CREATE TYPE "public"."client_status" AS ENUM (
    'prospect',
    'active',
    'archived'
);


ALTER TYPE "public"."client_status" OWNER TO "postgres";


CREATE TYPE "public"."file_status" AS ENUM (
    'pending',
    'uploaded',
    'error'
);


ALTER TYPE "public"."file_status" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_status" AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'paused'
);


ALTER TYPE "public"."plan_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_tier" AS ENUM (
    'trial',
    'pro',
    'enterprise',
    'demo'
);


ALTER TYPE "public"."plan_tier" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'unpaid'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."template_scope" AS ENUM (
    'private',
    'global'
);


ALTER TYPE "public"."template_scope" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'suspended',
    'archived'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_get_org_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _claims jsonb; _org_id uuid;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _org_id := (_claims -> 'app_metadata' ->> 'org_id')::uuid;
  if _org_id is not null then return _org_id; end if;
  select org_id into _org_id from public.profiles where id = auth.uid();
  return coalesce(_org_id, '00000000-0000-0000-0000-000000000000'::uuid);
end;
$$;


ALTER FUNCTION "public"."app_get_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_is_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and status = 'active'
  );
$$;


ALTER FUNCTION "public"."app_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _claims jsonb; _role text;
begin
  _claims := current_setting('request.jwt.claims', true)::jsonb;
  _role := (_claims -> 'app_metadata' ->> 'role');
  if _role is not null then return _role = 'admin'; end if;
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end;
$$;


ALTER FUNCTION "public"."app_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_lawyer_org_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if new.assigned_lawyer_id is not null then
    perform 1 from profiles
    where id = new.assigned_lawyer_id
    and org_id = new.org_id;
    
    if not found then
      raise exception 'Integrity Violation: Assigned lawyer must belong to the same organization';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."check_lawyer_org_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_org_quotas"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_plan_tier plan_tier;
  v_plan_status plan_status;
  v_count int;
  v_limit int;
  v_max_storage bigint;
  v_lock_key bigint;
  v_trial_ends_at timestamptz;
  v_org_id uuid;
  v_new_json jsonb;
begin
  -- SAFE EXTRACTION: Get org_id from JSON to avoid "column does not exist" error
  v_new_json := row_to_json(new);
  
  if v_new_json ? 'org_id' then
    v_org_id := (v_new_json->>'org_id')::uuid;
  else
    -- Column missing? This trigger shouldn't be running here. Gracefully exit.
    return new;
  end if;

  if v_org_id is null then
    return new;
  end if;

  -- Critical: Serialize inserts for this Org to prevent race conditions (The Quota Crusher)
  v_lock_key := hashtext('client_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Get Org Settings
  select o.plan_tier, o.plan_status, o.trial_ends_at, pc.max_clients
  into v_plan_tier, v_plan_status, v_trial_ends_at, v_limit
  from organizations o
  left join plan_configs pc on o.plan_tier = pc.plan
  where o.id = v_org_id;

  -- 1. Enforce Plan Status & Trial Expiration
  if v_plan_status = 'trialing' and v_trial_ends_at < now() then
      raise exception 'Organization trial has expired.';
  end if;

  if v_plan_status not in ('active', 'trialing') then
      raise exception 'Organization subscription is not active.';
  end if;
  
  -- Fallback if config missing
  if v_limit is null then v_limit := 5; end if;

  if TG_TABLE_NAME = 'clients' then
    select count(*) into v_count from clients where org_id = v_org_id;
    
    if v_count >= v_limit then
      raise exception using
        errcode = 'BLQCL',
        message = 'BILLING_QUOTA_CLIENTS';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_org_quotas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_key" "text", "p_capacity" integer, "p_refill_rate_per_second" integer, "p_cost" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_tokens int;
  v_last_refill timestamptz;
  v_now timestamptz := now();
  v_seconds_passed numeric;
  v_new_tokens int;
begin
  select tokens, last_refill into v_tokens, v_last_refill
  from public.rate_limits
  where key = p_key
  for update;

  if not found then
    v_tokens := p_capacity;
    v_last_refill := v_now;
    insert into public.rate_limits (key, tokens, last_refill)
    values (p_key, v_tokens, v_last_refill);
  end if;

  v_seconds_passed := extract(epoch from (v_now - v_last_refill));
  v_new_tokens := floor(v_seconds_passed * p_refill_rate_per_second)::int;
  
  if v_new_tokens > 0 then
    v_tokens := least(v_tokens + v_new_tokens, p_capacity);
    v_last_refill := v_now;
  end if;

  if v_tokens >= p_cost then
    update public.rate_limits 
    set tokens = v_tokens - p_cost, last_refill = v_last_refill
    where key = p_key;
    return true;
  else
    return false;
  end if;
end;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_key" "text", "p_capacity" integer, "p_refill_rate_per_second" integer, "p_cost" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."case_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "file_key" "text",
    "file_size" bigint DEFAULT 0 NOT NULL,
    "category" "text" NOT NULL,
    "status" "public"."file_status" DEFAULT 'pending'::"public"."file_status" NOT NULL,
    "exception_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    CONSTRAINT "case_files_file_size_check" CHECK (("file_size" >= 0)),
    CONSTRAINT "check_file_category" CHECK (("category" = ANY (ARRAY['DNI'::"text", 'Contrato'::"text", 'Escritura'::"text", 'Poder'::"text", 'Otro'::"text", 'Factura'::"text", 'Sentencia'::"text"])))
);


ALTER TABLE "public"."case_files" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") RETURNS "public"."case_files"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_file public.case_files;
  v_org_id uuid;
begin
  if p_file_size <= 0 then
    raise exception 'Invalid file size: must be positive';
  end if;
  
  if p_file_key is null or length(trim(p_file_key)) = 0 then
    raise exception 'Invalid file key: cannot be empty';
  end if;

  select c.org_id into v_org_id
  from public.case_files cf
  join public.cases c on c.id = cf.case_id
  where cf.id = p_file_id
  and c.org_id = public.app_get_org_id()
  and (
    public.app_is_admin()
    or exists (
      select 1 from public.clients cl
      where cl.id = c.client_id
      and cl.assigned_lawyer_id = auth.uid()
    )
  )
  and public.app_is_active();

  if v_org_id is null then
    raise exception 'File not found or access denied';
  end if;

  update public.case_files
  set 
    status = 'uploaded',
    file_size = p_file_size,
    file_key = p_file_key,
    updated_at = now()
  where id = p_file_id
  returning * into v_file;

  return v_file;
end;
$$;


ALTER FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_file_upload_portal"("p_token" "text", "p_file_id" "uuid", "p_file_key" "text", "p_file_size" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_case_id uuid;
  v_exists boolean;
begin
  if p_file_size <= 0 then
    raise exception 'Invalid file size';
  end if;

  select id into v_case_id
  from public.cases
  where token = p_token;

  if v_case_id is null then
    raise exception 'Invalid case token';
  end if;

  select exists(
    select 1 from public.case_files
    where id = p_file_id and case_id = v_case_id
  ) into v_exists;

  if not v_exists then
    raise exception 'File does not belong to this case';
  end if;

  update public.case_files
  set 
    status = 'uploaded',
    file_key = p_file_key,
    file_size = p_file_size,
    updated_at = now()
  where id = p_file_id;
end;
$$;


ALTER FUNCTION "public"."confirm_file_upload_portal"("p_token" "text", "p_file_id" "uuid", "p_file_key" "text", "p_file_size" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_active_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_status plan_status;
  v_trial_ends_at timestamptz;
begin
  select plan_status, trial_ends_at into v_status, v_trial_ends_at from organizations where id = new.org_id;
  
  if v_status = 'trialing' and v_trial_ends_at < now() then
      raise exception using
        errcode = 'BLQUS',
        message = 'BILLING_TRIAL_EXPIRED';
  end if;

  if v_status not in ('active', 'trialing') then
      raise exception using
        errcode = 'BLQUS',
        message = 'BILLING_SUBSCRIPTION_INACTIVE';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_active_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."flag_file_exception"("p_token" "text", "p_file_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then
    raise exception 'Invalid or Expired Link';
  end if;

  update public.case_files
  set 
    status = 'pending',
    exception_reason = p_reason,
    updated_at = now()
  where id = p_file_id 
  and case_id = v_case_id;
end;
$$;


ALTER FUNCTION "public"."flag_file_exception"("p_token" "text", "p_file_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_files_for_case"("p_case_id" "uuid", "p_org_id" "uuid", "p_template_snapshot" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_key text;
  v_field jsonb;
begin
  -- Check if snapshot exists and is not empty
  if p_template_snapshot is null or p_template_snapshot = '{}'::jsonb then
    return;
  end if;

  -- Iterate over keys in the JSONB object
  for v_key, v_field in select * from jsonb_each(p_template_snapshot)
  loop
    -- Check if field type is 'file'
    if (v_field->>'type') = 'file' then
      -- Idempotency check: Don't insert if already exists for this case and label
      if not exists (
          select 1 from public.case_files 
          where case_id = p_case_id 
          and description = (v_field->>'label')
      ) then
          insert into public.case_files (
            org_id,
            case_id,
            category,
            description,
            status,
            updated_at
          ) values (
            p_org_id,
            p_case_id,
            'Otro', 
            v_field->>'label',
            'pending',
            now()
          );
      end if;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."generate_files_for_case"("p_case_id" "uuid", "p_org_id" "uuid", "p_template_snapshot" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_files_from_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  perform public.generate_files_for_case(new.id, new.org_id, new.template_snapshot);
  return new;
end;
$$;


ALTER FUNCTION "public"."generate_files_from_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_case_by_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_case public.cases;
  v_client_name text;
  v_files jsonb;
begin
  select * into v_case from public.cases where token = p_token;
  
  if v_case is null then
    raise exception 'Case not found or invalid token';
  end if;

  if v_case.expires_at < now() then
    raise exception 'Link expired';
  end if;

  select full_name into v_client_name from public.clients where id = v_case.client_id;

  select jsonb_agg(jsonb_build_object(
    'id', cf.id,
    'category', cf.category,
    'description', cf.description,
    'status', cf.status,
    'exception_reason', cf.exception_reason
  )) into v_files
  from public.case_files cf
  where cf.case_id = v_case.id;

  return jsonb_build_object(
    'case', row_to_json(v_case),
    'client_name', v_client_name,
    'files', coalesce(v_files, '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."get_case_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_case_validation"("p_token" "text") RETURNS TABLE("found" boolean, "org_name" "text", "org_logo_url" "text", "client_name" "text", "case_status" "text", "case_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as found,
    o.name as org_name,
    o.logo_url as org_logo_url,
    c.full_name as client_name,
    cse.status::text as case_status, -- FIX: Explicit cast to text
    cse.created_at as case_created_at
  FROM cases cse
  JOIN organizations o ON o.id = cse.org_id
  JOIN clients c ON c.id = cse.client_id
  WHERE cse.token = p_token;
END;
$$;


ALTER FUNCTION "public"."get_case_validation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation"("p_token" "text") RETURNS TABLE("id" "uuid", "email" "text", "role" "public"."user_role", "status" "public"."invitation_status", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select 
    i.id,
    i.email,
    i.role,
    i.status,
    i.expires_at
  from public.invitations i
  where i.token = p_token;
end;
$$;


ALTER FUNCTION "public"."get_invitation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token"("p_token" "text") RETURNS TABLE("email" "text", "org_name" "text", "role" "public"."user_role", "status" "public"."invitation_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select 
    i.email, 
    o.name as org_name, 
    i.role, 
    i.status
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token
  and i.status = 'pending'
  and i.expires_at > now();
end;
$$;


ALTER FUNCTION "public"."get_invitation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_org_id uuid;
  v_role user_role := 'member';
begin
  select org_id, role into v_org_id, v_role
  from public.invitations
  where email = new.email
  and status = 'pending'
  for update limit 1;

  if v_org_id is not null then
      update public.invitations 
      set status = 'accepted' 
      where email = new.email 
      and status = 'pending';
      
      if not found then
        v_org_id := null;
        v_role := 'member';
      end if;
  end if;

  insert into public.profiles (id, org_id, role, full_name, avatar_url)
  values (
    new.id,
    v_org_id,
    coalesce(v_role, 'member'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception 
  when not_null_violation then
    return new;
  when others then
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_new_json jsonb;
  v_old_json jsonb;
  v_org_id uuid;
begin
  v_new_json := null;
  v_old_json := null;

  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    v_new_json := row_to_json(new);
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    v_old_json := row_to_json(old);
  end if;

  if v_new_json ? 'org_id' then
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif v_old_json ? 'org_id' then
     v_org_id := (v_old_json->>'org_id')::uuid;
  else
     v_org_id := null;
  end if;

  insert into audit_logs (org_id, actor_id, action, target_id, metadata)
  values (
    v_org_id,
    auth.uid(),
    TG_TABLE_NAME || '_' || TG_OP,
    COALESCE(new.id, old.id),
    jsonb_build_object(
      'old', v_old_json, 
      'new', v_new_json,
      'triggered_by', current_user
    )
  );
  return null;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."log_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_portal_access"("p_case_token" "text", "p_event_type" "text", "p_step_index" integer DEFAULT NULL::integer, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_case_token;
  
  if v_case_id is null then
    return;
  end if;

  insert into public.portal_analytics (
    case_id, 
    event_type, 
    step_index, 
    metadata,
    user_agent
  )
  values (
    v_case_id, 
    p_event_type, 
    p_step_index, 
    p_metadata,
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
end;
$$;


ALTER FUNCTION "public"."log_portal_access"("p_case_token" "text", "p_event_type" "text", "p_step_index" integer, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_last_admin_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_admin_count int;
begin
  if old.role = 'admin' then
    select count(*) into v_admin_count 
    from public.profiles 
    where org_id = old.org_id and role = 'admin';

    if v_admin_count <= 1 then
      raise exception using
        errcode = 'INTEG',
        message = 'AUTH_LAST_ADMIN';
    end if;
  end if;
  return old;
end;
$$;


ALTER FUNCTION "public"."prevent_last_admin_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_storage_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if old.file_key is not null then
    insert into storage_delete_queue (bucket_id, file_path)
    values ('secure-docs', old.file_key);
  end if;
  return old;
end;
$$;


ALTER FUNCTION "public"."queue_storage_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_case_token"("p_case_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_new_token text;
begin
  if not exists (
    select 1 from public.cases c
    where c.id = p_case_id
    and (
      (public.app_is_admin() and c.org_id = public.app_get_org_id())
      or exists (
        select 1 from public.clients cl
        where cl.id = c.client_id
        and cl.assigned_lawyer_id = auth.uid()
      )
    )
    and public.app_is_active()
  ) then
    raise exception 'Access Denied or Case Not Found';
  end if;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  update public.cases
  set token = v_new_token, updated_at = now()
  where id = p_case_id;

  return v_new_token;
end;
$$;


ALTER FUNCTION "public"."regenerate_case_token"("p_case_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_org_member"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_requester_org uuid;
  v_target_org uuid;
  v_target_role user_role;
  v_admin_count int;
begin
  v_requester_org := public.app_get_org_id();
  
  if not public.app_is_admin() then
    raise exception 'Access Denied: Only Admins can remove members.';
  end if;

  if not public.app_is_active() then
     raise exception 'Access Denied: User is suspended.';
  end if;

  select org_id, role into v_target_org, v_target_role from public.profiles where id = target_user_id;
  
  if v_target_org is null or v_target_org <> v_requester_org then
    raise exception 'Target user not found in your organization.';
  end if;

  if v_target_role = 'admin' then
    select count(*) into v_admin_count 
    from public.profiles 
    where org_id = v_requester_org and role = 'admin' and status = 'active'; 

    if v_admin_count <= 1 then
      raise exception 'Constraint Violation: Cannot remove the last Admin of the organization.';
    end if;
  end if;

  update public.profiles 
  set status = 'suspended', updated_at = now()
  where id = target_user_id;
end;
$$;


ALTER FUNCTION "public"."remove_org_member"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_questionnaire_answers"("p_token" "text", "p_answers" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_case_id uuid;
begin
  select id into v_case_id from public.cases where token = p_token;
  
  if v_case_id is null then
    raise exception 'Case not found or invalid token';
  end if;

  update public.cases
  set 
    questionnaire_answers = p_answers,
    updated_at = now()
  where id = v_case_id;
end;
$$;


ALTER FUNCTION "public"."submit_questionnaire_answers"("p_token" "text", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_claims_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'org_id', new.org_id,
      'role', new.role
    )
  where id = new.id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_claims_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update organizations 
  set plan_status = case 
    when new.status = 'active' then 'active'::plan_status
    when new.status = 'trialing' then 'trialing'::plan_status
    when new.status in ('past_due', 'unpaid') then 'past_due'::plan_status
    else 'canceled'::plan_status
  end,
  updated_at = now()
  where id = new.org_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_subscription_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_process_zip_job"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  request_id bigint;
begin
  -- Call the Edge Function via pg_net (verify_jwt=false)
  -- URL derived from project ID: zhmkfftbvwvuqpekfvrx
  -- We include the record in the payload.
  
  select net.http_post(
      url := 'https://zhmkfftbvwvuqpekfvrx.supabase.co/functions/v1/process-zip-job',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
  ) into request_id;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."trigger_process_zip_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_case_progress"("p_token" "text", "p_step_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_case_id uuid;
begin
  if p_step_index < 0 then
    raise exception 'Invalid Step Index: Cannot be negative';
  end if;

  select id into v_case_id from public.cases where token = p_token and expires_at > now();
  
  if v_case_id is null then return; end if;

  update public.cases
  set current_step_index = p_step_index, updated_at = now()
  where id = v_case_id;
end;
$$;


ALTER FUNCTION "public"."update_case_progress"("p_token" "text", "p_step_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_storage_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_delta bigint;
  v_current_usage bigint;
  v_plan_tier plan_tier;
  v_plan_status plan_status;
  v_limit bigint;
  v_lock_key bigint;
  v_org_id uuid;
  v_trial_ends_at timestamptz;
  v_new_json jsonb;
  v_old_json jsonb;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
     v_new_json := row_to_json(new);
     if not (v_new_json ? 'org_id') then return null; end if; 
  end if;
  
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
     v_old_json := row_to_json(old);
     if not (v_old_json ? 'org_id') then return null; end if;
  end if;

  if (TG_OP = 'INSERT') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'UPDATE') then
     v_delta := coalesce((v_new_json->>'file_size')::bigint, 0) - coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_new_json->>'org_id')::uuid;
  elsif (TG_OP = 'DELETE') then
     v_delta := -coalesce((v_old_json->>'file_size')::bigint, 0);
     v_org_id := (v_old_json->>'org_id')::uuid;
  end if;

  if v_delta = 0 then return null; end if;
  if v_org_id is null then return null; end if;

  v_lock_key := hashtext('storage_quota_' || v_org_id::text);
  perform pg_advisory_xact_lock(v_lock_key);

  update organizations 
  set storage_used = storage_used + v_delta
  where id = v_org_id
  returning storage_used, plan_tier, plan_status, trial_ends_at into v_current_usage, v_plan_tier, v_plan_status, v_trial_ends_at;

  return null;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."update_storage_usage"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "template_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_step_index" integer DEFAULT 0 NOT NULL,
    "token" "text" NOT NULL,
    "status" "public"."case_status" DEFAULT 'draft'::"public"."case_status" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "questionnaire_answers" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "cases_current_step_index_check" CHECK (("current_step_index" >= 0)),
    CONSTRAINT "cases_template_snapshot_check" CHECK (("jsonb_typeof"("template_snapshot") = 'object'::"text"))
);


ALTER TABLE "public"."cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "assigned_lawyer_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "status" "public"."client_status" DEFAULT 'prospect'::"public"."client_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid",
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "requester_id" "uuid",
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "result_url" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "check_job_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "check_job_type" CHECK (("type" = ANY (ARRAY['zip_export'::"text", 'report_gen'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_notification_type" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'success'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "plan_tier" "public"."plan_tier" DEFAULT 'trial'::"public"."plan_tier" NOT NULL,
    "plan_status" "public"."plan_status" DEFAULT 'active'::"public"."plan_status" NOT NULL,
    "stripe_customer_id" "text",
    "trial_ends_at" timestamp with time zone,
    "storage_used" bigint DEFAULT 0 NOT NULL,
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#18181b'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizations_storage_used_check" CHECK (("storage_used" >= 0))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_configs" (
    "plan" "public"."plan_tier" NOT NULL,
    "max_clients" integer NOT NULL,
    "max_admins" integer NOT NULL,
    "max_storage_bytes" bigint NOT NULL,
    "can_white_label" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."plan_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "step_index" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_event_type" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'download'::"text", 'print'::"text", 'complete'::"text", 'exception'::"text"])))
);


ALTER TABLE "public"."portal_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "assigned_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "tokens" integer NOT NULL,
    "last_refill" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storage_delete_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "check_queue_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."storage_delete_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "status" "public"."subscription_status" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "owner_id" "uuid",
    "title" "text" NOT NULL,
    "schema" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "scope" "public"."template_scope" DEFAULT 'private'::"public"."template_scope" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "templates_schema_check" CHECK (("jsonb_typeof"("schema") = 'object'::"text"))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_email_key" UNIQUE ("org_id", "email");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."plan_configs"
    ADD CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("plan");



ALTER TABLE ONLY "public"."portal_analytics"
    ADD CONSTRAINT "portal_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."storage_delete_queue"
    ADD CONSTRAINT "storage_delete_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_logs_actor_action" ON "public"."audit_logs" USING "btree" ("actor_id", "action");



CREATE INDEX "idx_audit_logs_org_id_created" ON "public"."audit_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_case_files_case_id" ON "public"."case_files" USING "btree" ("case_id");



CREATE INDEX "idx_case_files_org_id" ON "public"."case_files" USING "btree" ("org_id");



CREATE INDEX "idx_case_files_status" ON "public"."case_files" USING "btree" ("status");



CREATE INDEX "idx_cases_client_id" ON "public"."cases" USING "btree" ("client_id");



CREATE INDEX "idx_cases_org_id" ON "public"."cases" USING "btree" ("org_id");



CREATE INDEX "idx_cases_status" ON "public"."cases" USING "btree" ("status");



CREATE INDEX "idx_cases_token" ON "public"."cases" USING "btree" ("token");



CREATE INDEX "idx_clients_assigned_lawyer" ON "public"."clients" USING "btree" ("assigned_lawyer_id");



CREATE INDEX "idx_clients_email_org" ON "public"."clients" USING "btree" ("org_id", "email");



CREATE INDEX "idx_clients_org_id" ON "public"."clients" USING "btree" ("org_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_invited_by" ON "public"."invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_jobs_org_id" ON "public"."jobs" USING "btree" ("org_id");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_notifications_org_id" ON "public"."notifications" USING "btree" ("org_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read" = false);



CREATE INDEX "idx_portal_analytics_case_id" ON "public"."portal_analytics" USING "btree" ("case_id");



CREATE INDEX "idx_profiles_org_id" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status");



CREATE INDEX "idx_storage_delete_queue_status" ON "public"."storage_delete_queue" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_org_id" ON "public"."subscriptions" USING "btree" ("org_id");



CREATE INDEX "idx_templates_org_id" ON "public"."templates" USING "btree" ("org_id");



CREATE INDEX "idx_templates_owner_id" ON "public"."templates" USING "btree" ("owner_id");



CREATE OR REPLACE TRIGGER "check_billing_cases" BEFORE INSERT ON "public"."cases" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_active_subscription"();



CREATE OR REPLACE TRIGGER "check_billing_invitations" BEFORE INSERT ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_active_subscription"();



CREATE OR REPLACE TRIGGER "check_clients_quota" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."check_org_quotas"();



CREATE OR REPLACE TRIGGER "on_case_file_deleted" AFTER DELETE ON "public"."case_files" FOR EACH ROW EXECUTE FUNCTION "public"."queue_storage_deletion"();



CREATE OR REPLACE TRIGGER "on_profile_delete_check" BEFORE DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_admin_delete"();



CREATE OR REPLACE TRIGGER "on_zip_job_created" AFTER INSERT ON "public"."jobs" FOR EACH ROW WHEN ((("new"."type" = 'zip_export'::"text") AND ("new"."status" = 'pending'::"text"))) EXECUTE FUNCTION "public"."trigger_process_zip_job"();



CREATE OR REPLACE TRIGGER "tr_audit_case_files" AFTER INSERT OR DELETE OR UPDATE ON "public"."case_files" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_audit_cases" AFTER INSERT OR DELETE OR UPDATE ON "public"."cases" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_audit_clients" AFTER INSERT OR DELETE OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_audit_invitations" AFTER INSERT OR DELETE OR UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_audit_organizations" AFTER UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_audit_profiles" AFTER INSERT OR DELETE OR UPDATE OF "role", "full_name" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "tr_check_lawyer_org" BEFORE INSERT OR UPDATE OF "assigned_lawyer_id", "org_id" ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."check_lawyer_org_match"();



CREATE OR REPLACE TRIGGER "tr_generate_files" AFTER INSERT ON "public"."cases" FOR EACH ROW EXECUTE FUNCTION "public"."generate_files_from_snapshot"();



CREATE OR REPLACE TRIGGER "tr_sync_claims" AFTER INSERT OR UPDATE OF "org_id", "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_claims_to_auth"();



CREATE OR REPLACE TRIGGER "tr_sync_subscription_org" AFTER INSERT OR UPDATE OF "status" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_status"();



CREATE OR REPLACE TRIGGER "tr_track_storage_usage" AFTER INSERT OR DELETE OR UPDATE OF "file_size" ON "public"."case_files" FOR EACH ROW EXECUTE FUNCTION "public"."update_storage_usage"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_analytics"
    ADD CONSTRAINT "portal_analytics_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Access Case Files" ON "public"."case_files" FOR SELECT USING (((("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE (("cases"."id" = "case_files"."case_id") AND (("public"."app_is_admin"() AND ("cases"."org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
           FROM "public"."clients"
          WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"()))))))))) AND "public"."app_is_active"()));



CREATE POLICY "Admins can update any profile in their organization" ON "public"."profiles" FOR UPDATE USING ((("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"() AND "public"."app_is_active"()));



CREATE POLICY "Admins can update their organization" ON "public"."organizations" FOR UPDATE USING ((("id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"()));



CREATE POLICY "Admins view and manage invitations" ON "public"."invitations" USING ((("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"() AND "public"."app_is_active"()));



CREATE POLICY "Admins view audit logs" ON "public"."audit_logs" FOR SELECT USING ((("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"() AND "public"."app_is_active"()));



CREATE POLICY "Admins view portal analytics" ON "public"."portal_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE (("cases"."id" = "portal_analytics"."case_id") AND ("cases"."org_id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"()))));



CREATE POLICY "Admins view subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_admin"() AND "public"."app_is_active"()));



CREATE POLICY "Authenticated read plan configs" ON "public"."plan_configs" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND "public"."app_is_active"()));



CREATE POLICY "Authenticated users insert organizations" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Delete Case Files" ON "public"."case_files" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE (("cases"."id" = "case_files"."case_id") AND (("public"."app_is_admin"() AND ("cases"."org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
           FROM "public"."clients"
          WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"())))))))) AND "public"."app_is_active"()));



CREATE POLICY "Delete Cases" ON "public"."cases" FOR DELETE USING (("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_active"()));



CREATE POLICY "Delete Clients" ON "public"."clients" FOR DELETE USING (("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_active"()));



CREATE POLICY "Delete Templates" ON "public"."templates" FOR DELETE USING ((("owner_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Insert Case Files" ON "public"."case_files" FOR INSERT WITH CHECK ((("org_id" = "public"."app_get_org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE (("cases"."id" = "case_files"."case_id") AND ("cases"."org_id" = "public"."app_get_org_id"())))) AND "public"."app_is_active"()));



CREATE POLICY "Insert Cases" ON "public"."cases" FOR INSERT WITH CHECK ((("org_id" = "public"."app_get_org_id"()) AND ("public"."app_is_admin"() OR ((EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"())))) AND "public"."app_is_active"()))));



CREATE POLICY "Insert Templates" ON "public"."templates" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) AND ("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_active"()));



CREATE POLICY "Members can insert clients" ON "public"."clients" FOR INSERT WITH CHECK ((("org_id" = "public"."app_get_org_id"()) AND "public"."app_is_active"()));



CREATE POLICY "Members view own logs" ON "public"."audit_logs" FOR SELECT USING ((("actor_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Public insert portal analytics" ON "public"."portal_analytics" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE ("cases"."id" = "portal_analytics"."case_id"))));



CREATE POLICY "Select Cases" ON "public"."cases" FOR SELECT USING (((("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"()))))) AND "public"."app_is_active"()));



CREATE POLICY "Select Clients" ON "public"."clients" FOR SELECT USING (((("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"())) OR ("assigned_lawyer_id" = "auth"."uid"())) AND "public"."app_is_active"()));



CREATE POLICY "Select Templates" ON "public"."templates" FOR SELECT USING ((((("scope" = 'global'::"public"."template_scope") AND ("org_id" = "public"."app_get_org_id"())) OR ("owner_id" = "auth"."uid"())) AND "public"."app_is_active"()));



CREATE POLICY "Update Case Files" ON "public"."case_files" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."cases"
  WHERE (("cases"."id" = "case_files"."case_id") AND (("public"."app_is_admin"() AND ("cases"."org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
           FROM "public"."clients"
          WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"())))))))) AND "public"."app_is_active"()));



CREATE POLICY "Update Cases" ON "public"."cases" FOR UPDATE USING (((("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"())) OR (EXISTS ( SELECT 1
   FROM "public"."clients"
  WHERE (("clients"."id" = "cases"."client_id") AND ("clients"."assigned_lawyer_id" = "auth"."uid"()))))) AND "public"."app_is_active"()));



CREATE POLICY "Update Clients" ON "public"."clients" FOR UPDATE USING (((("public"."app_is_admin"() AND ("org_id" = "public"."app_get_org_id"())) OR ("assigned_lawyer_id" = "auth"."uid"())) AND "public"."app_is_active"()));



CREATE POLICY "Update Templates" ON "public"."templates" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users can insert audit logs for their org" ON "public"."audit_logs" FOR INSERT WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert jobs" ON "public"."jobs" FOR INSERT WITH CHECK ((("org_id" = "public"."app_get_org_id"()) AND ("requester_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((("id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((("id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users can view audit logs of their org" ON "public"."audit_logs" FOR SELECT USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view profiles in their organization" ON "public"."profiles" FOR SELECT USING (("org_id" = "public"."app_get_org_id"()));



CREATE POLICY "Users can view their own organization" ON "public"."organizations" FOR SELECT USING (("id" = "public"."app_get_org_id"()));



CREATE POLICY "Users update own notifications (mark read)" ON "public"."notifications" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users view own notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND "public"."app_is_active"()));



CREATE POLICY "Users view their own jobs" ON "public"."jobs" FOR SELECT USING ((("org_id" = "public"."app_get_org_id"()) AND (("requester_id" = "auth"."uid"()) OR "public"."app_is_admin"()) AND "public"."app_is_active"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_delete_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."audit_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."case_files";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cases";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."app_get_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_get_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_get_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."app_is_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_is_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."app_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_lawyer_org_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_lawyer_org_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_lawyer_org_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_org_quotas"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_org_quotas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_org_quotas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_capacity" integer, "p_refill_rate_per_second" integer, "p_cost" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_capacity" integer, "p_refill_rate_per_second" integer, "p_cost" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_capacity" integer, "p_refill_rate_per_second" integer, "p_cost" integer) TO "service_role";



GRANT ALL ON TABLE "public"."case_files" TO "anon";
GRANT ALL ON TABLE "public"."case_files" TO "authenticated";
GRANT ALL ON TABLE "public"."case_files" TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_file_upload"("p_file_id" "uuid", "p_file_size" bigint, "p_file_key" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."confirm_file_upload_portal"("p_token" "text", "p_file_id" "uuid", "p_file_key" "text", "p_file_size" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_file_upload_portal"("p_token" "text", "p_file_id" "uuid", "p_file_key" "text", "p_file_size" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_file_upload_portal"("p_token" "text", "p_file_id" "uuid", "p_file_key" "text", "p_file_size" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_active_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_active_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_active_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."flag_file_exception"("p_token" "text", "p_file_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."flag_file_exception"("p_token" "text", "p_file_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."flag_file_exception"("p_token" "text", "p_file_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_files_for_case"("p_case_id" "uuid", "p_org_id" "uuid", "p_template_snapshot" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_files_for_case"("p_case_id" "uuid", "p_org_id" "uuid", "p_template_snapshot" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_files_for_case"("p_case_id" "uuid", "p_org_id" "uuid", "p_template_snapshot" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_files_from_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_files_from_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_files_from_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_case_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_case_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_case_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_case_validation"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_case_validation"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_case_validation"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_portal_access"("p_case_token" "text", "p_event_type" "text", "p_step_index" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_portal_access"("p_case_token" "text", "p_event_type" "text", "p_step_index" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_portal_access"("p_case_token" "text", "p_event_type" "text", "p_step_index" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_last_admin_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_last_admin_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_last_admin_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_storage_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."queue_storage_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_storage_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_case_token"("p_case_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_case_token"("p_case_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_case_token"("p_case_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_questionnaire_answers"("p_token" "text", "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_questionnaire_answers"("p_token" "text", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_questionnaire_answers"("p_token" "text", "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_claims_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_claims_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_claims_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_process_zip_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_process_zip_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_process_zip_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_case_progress"("p_token" "text", "p_step_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_case_progress"("p_token" "text", "p_step_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_case_progress"("p_token" "text", "p_step_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_storage_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_storage_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_storage_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cases" TO "anon";
GRANT ALL ON TABLE "public"."cases" TO "authenticated";
GRANT ALL ON TABLE "public"."cases" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."plan_configs" TO "anon";
GRANT ALL ON TABLE "public"."plan_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_configs" TO "service_role";



GRANT ALL ON TABLE "public"."portal_analytics" TO "anon";
GRANT ALL ON TABLE "public"."portal_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."storage_delete_queue" TO "anon";
GRANT ALL ON TABLE "public"."storage_delete_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_delete_queue" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































  create policy "Auth users can delete org assets"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-assets'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Auth users can update org assets"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'organization-assets'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Auth users can upload org assets"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-assets'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Portal users can select case files"
  on "storage"."objects"
  as permissive
  for select
  to anon
using ((bucket_id = 'case-files'::text));



  create policy "Portal users can update case files"
  on "storage"."objects"
  as permissive
  for update
  to anon
using ((bucket_id = 'case-files'::text));



  create policy "Portal users can upload case files"
  on "storage"."objects"
  as permissive
  for insert
  to anon
with check ((bucket_id = 'case-files'::text));



  create policy "Public Read for Org Assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'organization-assets'::text));



  create policy "Service Role Full Access"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'zip-exports'::text))
with check ((bucket_id = 'zip-exports'::text));



  create policy "Staff can do everything on case files"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using ((bucket_id = 'case-files'::text))
with check ((bucket_id = 'case-files'::text));



