BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_rewarded_at timestamp;
UPDATE users u SET billing_cycle = 'annual'
WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id AND t.type LIKE 'mensalidade_%' AND t.description LIKE '%(annual)%');
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
COMMIT;
