/*
  # Fix Auth RLS Initialization Issues

  1. Database Functions
    - Create missing RPC functions for optimized queries
    - Add proper error handling and performance optimizations
    - Fix auth function dependencies

  2. RLS Policy Fixes
    - Simplify complex policies that may cause auth issues
    - Add proper null checks for auth.uid()
    - Optimize policy performance

  3. Auth Function Validation
    - Add functions to validate auth state
    - Create fallback mechanisms for auth failures
*/

-- First, let's create a function to safely get the current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Create optimized platform stats function
CREATE OR REPLACE FUNCTION get_platform_stats_optimized()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users_count integer := 0;
  online_users_count integer := 0;
  available_missions_count integer := 0;
  result json;
BEGIN
  -- Get total users count with error handling
  BEGIN
    SELECT COUNT(*) INTO total_users_count FROM users;
  EXCEPTION WHEN OTHERS THEN
    total_users_count := 0;
  END;
  
  -- Get online users count (users active in last 5 minutes)
  BEGIN
    SELECT COUNT(*) INTO online_users_count 
    FROM user_activity 
    WHERE last_seen > now() - interval '5 minutes';
  EXCEPTION WHEN OTHERS THEN
    online_users_count := 0;
  END;

  -- Get available missions count
  BEGIN
    SELECT COUNT(*) INTO available_missions_count
    FROM missions
    WHERE status = 'available';
  EXCEPTION WHEN OTHERS THEN
    available_missions_count := 0;
  END;
  
  -- Build result
  SELECT json_build_object(
    'total_users', total_users_count,
    'online_users', online_users_count,
    'available_missions', available_missions_count
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create optimized user stats function
CREATE OR REPLACE FUNCTION get_user_stats_optimized(user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  created_missions_count integer := 0;
  completed_missions_count integer := 0;
  result json;
BEGIN
  -- Use provided user_id or current user
  target_user_id := COALESCE(user_id, get_current_user_id());
  
  -- Validate user exists and is authenticated
  IF NOT is_authenticated() AND user_id IS NULL THEN
    RETURN json_build_object(
      'created_missions', 0,
      'completed_missions', 0,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get created missions count
  BEGIN
    SELECT COUNT(*) INTO created_missions_count
    FROM missions
    WHERE created_by = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    created_missions_count := 0;
  END;

  -- For now, set completed missions to 0 since we don't have claims table
  completed_missions_count := 0;
  
  -- Build result
  SELECT json_build_object(
    'created_missions', created_missions_count,
    'completed_missions', completed_missions_count
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Improved get_user_profile function with better error handling
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  user_data json;
  user_permissions text[] := ARRAY[]::text[];
  user_tags_data json := '[]'::json;
BEGIN
  -- Use provided user_uuid or current user
  target_user_id := COALESCE(user_uuid, get_current_user_id());
  
  -- Validate authentication if no specific user requested
  IF user_uuid IS NULL AND NOT is_authenticated() THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Get user basic info with error handling
  BEGIN
    SELECT json_build_object(
      'id', id,
      'name', name,
      'email', email,
      'role', role,
      'department', department,
      'avatar_url', avatar_url,
      'bio', bio,
      'expertise_level', expertise_level,
      'github_username', github_username,
      'gitlab_username', gitlab_username,
      'discord_username', discord_username,
      'last_profile_change', last_profile_change,
      'can_change_profile', (last_profile_change IS NULL OR last_profile_change < now() - interval '30 days')
    ) INTO user_data
    FROM users
    WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', 'User not found');
  END;

  -- Return early if no user found
  IF user_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Get user permissions with error handling
  BEGIN
    SELECT array_agg(permission_name) INTO user_permissions
    FROM role_permissions rp
    JOIN users u ON u.role = rp.role
    WHERE u.id = target_user_id AND rp.is_active = true;
  EXCEPTION WHEN OTHERS THEN
    user_permissions := ARRAY['view_missions', 'create_missions', 'claim_missions'];
  END;

  -- Get user tags with error handling
  BEGIN
    SELECT json_agg(
      json_build_object(
        'tag_name', tag_name,
        'tag_value', tag_value,
        'granted_at', granted_at,
        'expires_at', expires_at
      )
    ) INTO user_tags_data
    FROM user_tags
    WHERE user_id = target_user_id AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  EXCEPTION WHEN OTHERS THEN
    user_tags_data := '[]'::json;
  END;

  -- Combine all data
  RETURN json_build_object(
    'profile', user_data,
    'permissions', COALESCE(user_permissions, ARRAY[]::text[]),
    'tags', COALESCE(user_tags_data, '[]'::json)
  );
END;
$$;

-- Simplified and optimized RLS policies

-- Drop and recreate users table policies with better performance
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    is_authenticated() AND 
    id = get_current_user_id() AND
    (last_profile_change IS NULL OR last_profile_change < now() - interval '30 days')
  )
  WITH CHECK (
    is_authenticated() AND 
    id = get_current_user_id()
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON users;
CREATE POLICY "Admins can update any profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    is_authenticated() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = get_current_user_id() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "New users can insert their profile" ON users;
CREATE POLICY "New users can insert their profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated() AND id = get_current_user_id());

-- Optimize missions table policies
DROP POLICY IF EXISTS "Anyone can view available missions" ON missions;
CREATE POLICY "Anyone can view available missions"
  ON missions
  FOR SELECT
  TO authenticated
  USING (status = 'available' OR (is_authenticated() AND created_by = get_current_user_id()));

DROP POLICY IF EXISTS "Authenticated users can create missions" ON missions;
CREATE POLICY "Authenticated users can create missions"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated() AND created_by = get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own missions" ON missions;
CREATE POLICY "Users can update their own missions"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (is_authenticated() AND created_by = get_current_user_id())
  WITH CHECK (is_authenticated() AND created_by = get_current_user_id());

-- Optimize user_tags policies
DROP POLICY IF EXISTS "Users can view their own tags" ON user_tags;
CREATE POLICY "Users can view their own tags"
  ON user_tags
  FOR SELECT
  TO authenticated
  USING (is_authenticated() AND user_id = get_current_user_id());

DROP POLICY IF EXISTS "Admins can view all tags" ON user_tags;
CREATE POLICY "Admins can view all tags"
  ON user_tags
  FOR SELECT
  TO authenticated
  USING (
    is_authenticated() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = get_current_user_id() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and moderators can manage tags" ON user_tags;
CREATE POLICY "Admins and moderators can manage tags"
  ON user_tags
  FOR ALL
  TO authenticated
  USING (
    is_authenticated() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = get_current_user_id() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    is_authenticated() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = get_current_user_id() AND role IN ('admin', 'moderator')
    )
  );

-- Optimize user_activity policies
DROP POLICY IF EXISTS "Users can manage their own activity" ON user_activity;
CREATE POLICY "Users can manage their own activity"
  ON user_activity
  FOR ALL
  TO authenticated
  USING (is_authenticated() AND user_id = get_current_user_id())
  WITH CHECK (is_authenticated() AND user_id = get_current_user_id());

-- Optimize role_permissions policies
DROP POLICY IF EXISTS "Everyone can view role permissions" ON role_permissions;
CREATE POLICY "Everyone can view role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

DROP POLICY IF EXISTS "Only admins can manage role permissions" ON role_permissions;
CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    is_authenticated() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = get_current_user_id() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity(last_seen);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role) WHERE is_active = true;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats_optimized() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_optimized(uuid) TO authenticated;

-- Update existing function permissions
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(uuid, user_role_type) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_tag(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_seen() TO authenticated;

-- Add a function to test auth connectivity
CREATE OR REPLACE FUNCTION test_auth_connection()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_user_id uuid;
  user_exists boolean := false;
BEGIN
  -- Test basic auth function
  current_user_id := auth.uid();
  
  -- Check if user exists in users table
  IF current_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM users WHERE id = current_user_id) INTO user_exists;
  END IF;
  
  -- Build test result
  SELECT json_build_object(
    'auth_uid', current_user_id,
    'is_authenticated', current_user_id IS NOT NULL,
    'user_exists_in_users_table', user_exists,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION test_auth_connection() TO authenticated;

-- Create a function to safely handle auth errors
CREATE OR REPLACE FUNCTION safe_auth_operation(operation_type text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  error_message text;
BEGIN
  BEGIN
    CASE operation_type
      WHEN 'get_user' THEN
        result := get_user_profile();
      WHEN 'test_auth' THEN
        result := test_auth_connection();
      WHEN 'platform_stats' THEN
        result := get_platform_stats_optimized();
      ELSE
        result := json_build_object('error', 'Unknown operation type');
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    result := json_build_object(
      'error', error_message,
      'operation', operation_type,
      'timestamp', now()
    );
  END;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION safe_auth_operation(text) TO authenticated;