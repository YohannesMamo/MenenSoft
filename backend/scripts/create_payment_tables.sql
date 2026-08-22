-- Migration: Add payment verification support
-- Run this against the MERP_OSHS database

-- 1. Add is_paid column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE "users" ADD COLUMN is_paid BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Create payment_verifications table
CREATE TABLE IF NOT EXISTS payment_verifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    amount NUMERIC,
    currency VARCHAR(10),
    payer_name VARCHAR(255),
    receiver_name VARCHAR(255),
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pv_user_id ON payment_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pv_reference ON payment_verifications(reference);
