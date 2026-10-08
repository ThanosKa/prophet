-- Row Level Security Policies
-- NOTE: RLS is OPTIONAL for this architecture
-- Current security model: Application-level (Clerk auth in API routes)
-- To use RLS: Requires Clerk → Supabase JWT integration

-- This file serves as a reference for production RLS setup
-- For now, security is handled in backend API routes via Clerk

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- NOTE: Requires auth.uid() to match Clerk user ID
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Chats table policies
CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- Messages table policies
CREATE POLICY "Users can view messages in own chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own chats"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Usage records policies
CREATE POLICY "Users can view own usage records"
  ON usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own usage records"
  ON usage_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- To enable these policies:
-- 1. Set up Clerk → Supabase JWT integration
-- 2. Pass Clerk JWT to Supabase client
-- 3. Run this migration
-- 4. Test with authenticated requests

-- Alternative: Keep RLS disabled and rely on API-level security
-- (Current approach - validated in backend/app/api routes)
