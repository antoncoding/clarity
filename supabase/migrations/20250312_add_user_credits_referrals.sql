-- Migration to add user credits and referral system

-- Track user credits and referral relationships
CREATE TABLE user_accounts (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  available_credits DECIMAL NOT NULL DEFAULT 0,
  lifetime_usage_cost DECIMAL NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  referred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Store token usage per conversation
CREATE TABLE conversation_usage (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view only their own account"
  ON user_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view only their own conversation usage"
  ON conversation_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Create indices
CREATE INDEX idx_conversation_usage_user_id ON conversation_usage(user_id);
CREATE INDEX idx_user_accounts_referred_by ON user_accounts(referred_by);

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_user_accounts_updated_at
BEFORE UPDATE ON user_accounts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); 