
-- Migration: Enforce explicit email verification status
-- Date: 2026-10-13
--
-- Purpose:
--   Every user must have an explicit email verification state.
--   New users default to unverified.
--
-- Changes:
--   1. Backfill any existing NULL verification states to FALSE.
--   2. Set FALSE as the default for new records.
--   3. Prevent NULL verification states.
--
-- Existing database audit:
--   NULL status: 0
--   Unverified users: 2
--   Verified users: 1

BEGIN;

-- Backfill legacy records without changing verified users.
UPDATE public.users
SET email_isverified = FALSE
WHERE email_isverified IS NULL;

-- Enforce the email verification invariant.
ALTER TABLE public.users
    ALTER COLUMN email_isverified SET DEFAULT FALSE,
    ALTER COLUMN email_isverified SET NOT NULL;

COMMIT;
