-- Per-message read receipts for the TClean messenger.
ALTER TABLE public.request_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS request_messages_unread_by_recipient
  ON public.request_messages (request_id, is_admin, read_at)
  WHERE read_at IS NULL;
