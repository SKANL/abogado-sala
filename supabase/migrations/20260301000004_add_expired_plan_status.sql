-- =============================================================================
-- Migration: Add 'expired' to plan_status enum + nightly pg_cron job
-- =============================================================================
-- Context:
--   The original plan_status enum only contained: active | trialing | past_due |
--   canceled | paused.  There was no 'expired' value, so trial expiry was
--   computed at application run-time in TypeScript.  This led to:
--     • Type cast hacks (string instead of the strict enum type)
--     • Duplicate expiry logic scattered across actions-read.ts and billing/actions.ts
--     • check_org_quotas still blocking on 'trialing + past trial_ends_at', meaning
--       two different code-paths for the same business concept
--     • No database-level enforcement → orgs could stay 'trialing' forever
--
--   This migration makes 'expired' a first-class database concept, adds a
--   self-healing trigger guard AND a nightly pg_cron job so the transition
--   happens automatically without any manual intervention.
-- =============================================================================

-- ─── STEP 1 OF 2 ─────────────────────────────────────────────────────────────
-- IMPORTANT: Run this file FIRST and wait for it to succeed.
-- Then run migration 20260301000005_expire_trial_logic.sql in a NEW query tab.
--
-- Reason: PostgreSQL requires ALTER TYPE ... ADD VALUE to be committed in its
-- own transaction before the new enum value can be referenced in function bodies.
-- Running both in the same SQL editor session causes error 55P04.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add 'expired' to the plan_status enum (committed immediately)
ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'expired';
