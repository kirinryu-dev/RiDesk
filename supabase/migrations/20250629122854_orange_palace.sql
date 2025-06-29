/*
  # Add user statistics function

  1. New Functions
    - get_platform_stats() - Returns total user count and online users
    - update_user_last_seen() - Updates user's last seen timestamp

  2. New Tables
    - user_activity - Tracks user last seen timestamps for online status

  3. Security
    - Enable RLS on user_activity table
    - Add policies for authenticated users to update their own activity
    - Create function accessible to authenticated users
*/

-- Create user activity tracking table
CREATE TABLE IF NOT EXISTS user_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own activity
CREATE POLICY "Users can manage their own activity"
  ON user_activity
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users integer;
  online_users integer;
  result json;
BEGIN
  -- Get total user count from auth.users
  SELECT COUNT(*) INTO total_users
  FROM auth.users
  WHERE deleted_at IS NULL;
  
  -- Get online users (active within last 5 minutes)
  SELECT COUNT(*) INTO online_users
  FROM user_activity
  WHERE last_seen > now() - interval '5 minutes';
  
  -- Return as JSON
  result := json_build_object(
    'total_users', total_users,
    'online_users', online_users
  );
  
  RETURN result;
END;
$$;

-- Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity (user_id, last_seen, updated_at)
  VALUES (auth.uid(), now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    last_seen = now(),
    updated_at = now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_seen() TO authenticated;