CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  display_name VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chats_distinct_users CHECK (user_low_id < user_high_id),
  CONSTRAINT chats_unique_pair UNIQUE (user_low_id, user_high_id)
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_activity ON chats(last_message_at DESC NULLS LAST, updated_at DESC);