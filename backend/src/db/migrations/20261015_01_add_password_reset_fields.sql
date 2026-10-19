
BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMPTZ;

COMMIT;
