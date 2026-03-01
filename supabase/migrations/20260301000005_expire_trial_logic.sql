-- ─── STEP 2 OF 2 ──────────────────────────────────────────────────────────────
-- Run this AFTER migration 20260301000004_add_expired_plan_status.sql succeeds.
-- That file added 'expired' to the plan_status enum in its own committed
-- transaction.  Now we can safely reference 'expired' in function bodies.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. Backfill already-expired trialing orgs ───────────────────────────────
UPDATE public.organizations
SET    plan_status = 'expired'
WHERE  plan_status = 'trialing'
  AND  trial_ends_at IS NOT NULL
  AND  trial_ends_at < now();


-- ─── 2. Function: expire_trialing_organizations() ────────────────────────────
-- Called by the nightly pg_cron job.  SECURITY DEFINER so cron runs it safely.
-- Returns the number of rows transitioned (useful in cron.job_run_details log).
CREATE OR REPLACE FUNCTION public.expire_trialing_organizations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.organizations
  SET    plan_status = 'expired'
  WHERE  plan_status = 'trialing'
    AND  trial_ends_at IS NOT NULL
    AND  trial_ends_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

ALTER FUNCTION public.expire_trialing_organizations() OWNER TO postgres;


-- ─── 3. Replace check_org_quotas ─────────────────────────────────────────────
-- Changes vs. previous version:
--   • Self-healing guard: if cron hasn't fired yet and trial has passed,
--     update the row to 'expired' inline so the next request also gets blocked.
--   • Guard 2 now covers 'expired' cleanly (not in active/trialing).
--   • Unified error codes: BLTEX (trial expired) | BLSUB (inactive) | BLQCL (quota).
CREATE OR REPLACE FUNCTION public.check_org_quotas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier     plan_tier;
  v_plan_status   plan_status;
  v_count         int;
  v_limit         int;
  v_lock_key      bigint;
  v_trial_ends_at timestamptz;
  v_org_id        uuid;
  v_new_json      jsonb;
BEGIN
  -- Safe extraction: works across all trigger-attached tables
  v_new_json := row_to_json(new);

  IF v_new_json ? 'org_id' THEN
    v_org_id := (v_new_json->>'org_id')::uuid;
  ELSE
    RETURN new;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN new;
  END IF;

  -- Serialize per-org to prevent quota race conditions
  v_lock_key := hashtext('quota_' || v_org_id::text);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT o.plan_tier, o.plan_status, o.trial_ends_at, pc.max_clients
  INTO   v_plan_tier, v_plan_status, v_trial_ends_at, v_limit
  FROM   organizations o
  LEFT JOIN plan_configs pc ON o.plan_tier = pc.plan
  WHERE  o.id = v_org_id;

  -- Guard 1 (self-healing): trial passed but cron hasn't run yet → fix inline
  IF v_plan_status = 'trialing'
     AND v_trial_ends_at IS NOT NULL
     AND v_trial_ends_at < now()
  THEN
    UPDATE public.organizations
    SET    plan_status = 'expired'
    WHERE  id = v_org_id;

    RAISE EXCEPTION USING
      ERRCODE = 'BLTEX',
      MESSAGE = 'BILLING_TRIAL_EXPIRED';
  END IF;

  -- Guard 2: block non-active statuses (expired, canceled, paused, past_due)
  IF v_plan_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'BLSUB',
      MESSAGE = 'BILLING_SUBSCRIPTION_INACTIVE';
  END IF;

  -- Quota enforcement
  IF v_limit IS NULL THEN v_limit := 5; END IF;

  IF TG_TABLE_NAME = 'clients' THEN
    SELECT count(*) INTO v_count FROM clients WHERE org_id = v_org_id;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION USING
        ERRCODE = 'BLQCL',
        MESSAGE = 'BILLING_QUOTA_CLIENTS';
    END IF;
  END IF;

  RETURN new;
END;
$$;

ALTER FUNCTION public.check_org_quotas() OWNER TO postgres;


-- ─── 4. pg_cron: nightly expiry job ─────────────────────────────────────────
-- Prerequisites:
--   • Enable pg_cron in Supabase Dashboard → Database → Extensions → pg_cron
--   • Must be installed in the "pg_catalog" schema (Supabase default)
--
-- cron.schedule() is idempotent by job name: re-running updates the existing job.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Expire trials every day at 00:05 UTC
SELECT cron.schedule(
  'expire-trialing-organizations',
  '5 0 * * *',
  'SELECT public.expire_trialing_organizations()'
);

-- Keep cron run log tidy (7-day retention)
SELECT cron.schedule(
  'clean-cron-job-run-details',
  '0 1 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);
