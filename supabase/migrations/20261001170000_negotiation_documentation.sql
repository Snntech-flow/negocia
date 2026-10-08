ALTER TABLE leads ADD COLUMN IF NOT EXISTS documentation jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS documentation_template jsonb;
