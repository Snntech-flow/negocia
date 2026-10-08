-- Compatible with the legacy recovery table, whose consumed timestamp is used_at.
-- Run as the database owner; application server connects through DATABASE_URL.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_version integer NOT NULL DEFAULT 0,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
-- Preserve the column used by the previous published version. Also support
-- databases created from the first draft of this migration (consumed_at).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'used_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'consumed_at'
  ) THEN
    ALTER TABLE public.password_reset_tokens RENAME COLUMN consumed_at TO used_at;
  END IF;
END $$;
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON public.password_reset_tokens(user_id);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;
-- No client policies: token operations are restricted to the application server.
