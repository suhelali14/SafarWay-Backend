-- First, check if the "Session" (uppercase) table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'Session'
);

-- Check if the "session" (lowercase) table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'session'
);

-- Drop the uppercase "Session" table if it exists
-- This will fail gracefully if it doesn't exist
DROP TABLE IF EXISTS "Session";

-- Make sure only the lowercase "session" table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%session%'; 