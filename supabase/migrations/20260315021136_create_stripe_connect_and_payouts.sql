/*
  # Stripe Connect & Host Payouts

  ## Summary
  Adds infrastructure for Stripe Connect host accounts and automatic post-game payouts.

  ## New Tables

  ### host_stripe_accounts
  Tracks each host's Stripe Connect Express account onboarding state.
  - `user_id` (text) — Firestore user ID of the host
  - `stripe_account_id` (text) — Stripe Connect account ID (acct_xxx)
  - `connect_status` (text) — 'pending' | 'active' | 'restricted'
  - `onboarding_url` (text, nullable) — Stripe-hosted onboarding URL, cleared after use
  - `created_at`, `updated_at` (timestamptz)

  ### host_payouts
  Records each automatic payout issued after a game ends.
  - `id` (uuid, primary key)
  - `room_id` (text) — Firestore room document ID
  - `host_user_id` (text) — Firestore user ID of the host who received the payout
  - `stripe_account_id` (text) — destination Stripe Connect account
  - `gross_collected_cents` (int) — total entry fees collected in cents
  - `platform_fee_cents` (int) — 2.5% retained by the platform
  - `net_payout_cents` (int) — amount transferred to host
  - `participant_count` (int) — number of paid participants
  - `payout_status` (text) — 'pending' | 'paid' | 'failed'
  - `stripe_transfer_ids` (text[]) — Stripe transfer IDs issued
  - `paid_out_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - host_stripe_accounts: hosts can read/upsert their own row; service role handles all
  - host_payouts: hosts can only read their own payouts; only service role can insert/update

  ## Notes
  - Both tables reference Firestore IDs as plain text strings
  - participant_payments extended with stripe_transfer_id column for traceability
*/

-- host_stripe_accounts
CREATE TABLE IF NOT EXISTS host_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  connect_status text NOT NULL DEFAULT 'pending',
  onboarding_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_stripe_accounts_user_id
  ON host_stripe_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_host_stripe_accounts_stripe_account_id
  ON host_stripe_accounts (stripe_account_id);

ALTER TABLE host_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read own stripe account"
  ON host_stripe_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Authenticated users can insert own stripe account"
  ON host_stripe_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Authenticated users can update own stripe account"
  ON host_stripe_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Allow service role full access (for Edge Functions using service key)
CREATE POLICY "Service role full access to host_stripe_accounts"
  ON host_stripe_accounts
  FOR SELECT
  TO service_role
  USING (true);

-- host_payouts
CREATE TABLE IF NOT EXISTS host_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  host_user_id text NOT NULL,
  stripe_account_id text NOT NULL,
  gross_collected_cents int NOT NULL DEFAULT 0,
  platform_fee_cents int NOT NULL DEFAULT 0,
  net_payout_cents int NOT NULL DEFAULT 0,
  participant_count int NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending',
  stripe_transfer_ids text[] DEFAULT '{}',
  paid_out_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_payouts_host_user_id
  ON host_payouts (host_user_id);

CREATE INDEX IF NOT EXISTS idx_host_payouts_room_id
  ON host_payouts (room_id);

ALTER TABLE host_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can read own payouts"
  ON host_payouts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = host_user_id);

CREATE POLICY "Service role can read all payouts"
  ON host_payouts
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert payouts"
  ON host_payouts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update payouts"
  ON host_payouts
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add stripe_transfer_id to participant_payments for traceability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participant_payments' AND column_name = 'stripe_transfer_id'
  ) THEN
    ALTER TABLE participant_payments ADD COLUMN stripe_transfer_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participant_payments' AND column_name = 'application_fee_cents'
  ) THEN
    ALTER TABLE participant_payments ADD COLUMN application_fee_cents int;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participant_payments' AND column_name = 'amount_cents'
  ) THEN
    ALTER TABLE participant_payments ADD COLUMN amount_cents int;
  END IF;
END $$;
