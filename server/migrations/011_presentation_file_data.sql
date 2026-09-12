-- Persist private PPT bytes with their existing metadata. This avoids Render's
-- ephemeral filesystem while retaining the protected download endpoints.
ALTER TABLE presentations
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS file_checksum TEXT;

-- Existing production databases can already contain these columns from an
-- earlier deployment.  Keep legacy rows nullable and add each named
-- constraint only when it is not already recorded on this table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'presentations'::regclass
      AND conname = 'presentations_file_size_check'
  ) THEN
    ALTER TABLE presentations
      ADD CONSTRAINT presentations_file_size_check
      CHECK (file_size IS NULL OR file_size BETWEEN 1 AND 20971520);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'presentations'::regclass
      AND conname = 'presentations_file_checksum_check'
  ) THEN
    ALTER TABLE presentations
      ADD CONSTRAINT presentations_file_checksum_check
      CHECK (file_checksum IS NULL OR file_checksum ~ '^[a-f0-9]{64}$');
  END IF;
END $$;
