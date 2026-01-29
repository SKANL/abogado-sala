-- 14-add-archived-status.sql
-- Description: Adds 'archived' state to case_status enum for soft cancellations.

-- Postgres allows adding values to ENUMs transactionally (since v12+)
-- "archived" represents cancelled, stalled, or historical reference cases.

alter type public.case_status add value if not exists 'archived';
