-- ==================== TRACKINGS ====================
CREATE TABLE IF NOT EXISTS trackings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL CHECK (carrier IN ('ghn', 'spx')),
  tracking_code TEXT NOT NULL,
  nickname TEXT,
  last_status TEXT,
  last_status_time TEXT,
  last_checked_at TIMESTAMPTZ,
  is_delivered BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_id INTEGER,
  UNIQUE (user_id, carrier, tracking_code)
);

CREATE INDEX IF NOT EXISTS idx_trackings_user ON trackings (user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_trackings_active ON trackings (is_archived, is_delivered, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_trackings_display ON trackings (user_id, display_id, is_archived);

-- ==================== PUSH SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

-- ==================== RLS ====================
ALTER TABLE trackings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically
-- Policies cho client (anon key) nếu cần sau này
