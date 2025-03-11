-- Simplified Schema (Removing news_requests table)
-- This file updates the schema to remove the news_requests table and related objects

-- Drop existing news_requests objects
DROP TRIGGER IF EXISTS update_news_requests_updated_at ON news_requests;
DROP POLICY IF EXISTS "Users can view their news requests" ON news_requests;
DROP TABLE IF EXISTS news_requests;

-- Update realtime publication (remove news_requests)
-- Check if table exists in the publication first
DO $$
DECLARE
  _exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'news_requests'
  ) INTO _exists;
  
  IF _exists THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE news_requests';
  END IF;
END
$$;
