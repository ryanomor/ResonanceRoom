/*
  # Create participant_payments table

  1. New Tables
    - `participant_payments`
      - `id` (uuid, primary key)
      - `participant_id` (text, the Firestore participant document ID)
      - `room_id` (text, the Firestore room document ID)
      - `stripe_session_id` (text, Stripe checkout session ID)
      - `payment_status` (text: 'pending' | 'paid' | 'refunded')
      - `paid_at` (timestamptz)
      - `refunded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `participant_payments` table
    - Anon users can read rows by participant_id (needed for client polling)
    - Only service role can insert/update (webhook does this)

  3. Notes
    - participant_id and room_id reference Firestore document IDs (strings, not UUIDs)
    - This table bridges Stripe payment status back to the Firestore-based app
*/

CREATE TABLE IF NOT EXISTS participant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id text NOT NULL,
  room_id text NOT NULL,
  stripe_session_id text,
  payment_status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participant_payments_participant_id
  ON participant_payments (participant_id);

CREATE INDEX IF NOT EXISTS idx_participant_payments_room_id
  ON participant_payments (room_id);

ALTER TABLE participant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read payment status by participant_id"
  ON participant_payments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can read payment status"
  ON participant_payments
  FOR SELECT
  TO authenticated
  USING (true);
