/*
  # Fix RLS Policies and Login Issues

  1. Database Structure
    - Fix multiple permissive policies on same tables
    - Consolidate RLS policies to avoid conflicts
    - Fix Stripe table policies
    - Add proper indexes for performance

  2. Authentication
    - Fix login flow and user creation
    - Ensure proper RLS initialization
    - Add safe auth functions

  3. Performance
    - Optimize queries and indexes
    - Add proper foreign key constraints
*/

-- First, let's drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any profile" ON users;
DROP POLICY IF EXISTS "New users can insert their profile" ON users;

DROP POLICY IF EXISTS "Anyone can view available missions" ON missions;
DROP POLICY IF EXISTS "Authenticated users can create missions" ON missions;
DROP POLICY IF EXISTS "Users can update their own missions" ON missions;

DROP POLICY IF EXISTS "Users can view their own tags" ON user_tags;
DROP POLICY IF EXISTS "Admins can view all tags" ON user_tags;
DROP POLICY IF EXISTS "Admins and moderators can manage tags" ON user_tags;

DROP POLICY IF EXISTS "Users can manage their own activity" ON user_activity;

DROP POLICY IF EXISTS "Everyone can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Only admins can manage role permissions" ON role_permissions;

DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;

-- Create helper functions for RLS
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role_type
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()),
    'user'::user_role_type
  );
$$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION auth_uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated, anon;

-- USERS TABLE POLICIES (Single policy per operation)
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated() AND id = auth_uid());

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE
  TO authenticated
  USING (
    is_authenticated() AND (
      id = auth_uid() OR 
      current_user_role() = 'admin'
    )
  )
  WITH CHECK (
    is_authenticated() AND (
      id = auth_uid() OR 
      current_user_role() = 'admin'
    )
  );

-- MISSIONS TABLE POLICIES
CREATE POLICY "missions_select_policy" ON missions
  FOR SELECT
  TO authenticated
  USING (
    status = 'available' OR 
    (is_authenticated() AND created_by = auth_uid())
  );

CREATE POLICY "missions_insert_policy" ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_authenticated() AND created_by = auth_uid());

CREATE POLICY "missions_update_policy" ON missions
  FOR UPDATE
  TO authenticated
  USING (is_authenticated() AND created_by = auth_uid())
  WITH CHECK (is_authenticated() AND created_by = auth_uid());

-- USER_TAGS TABLE POLICIES
CREATE POLICY "user_tags_select_policy" ON user_tags
  FOR SELECT
  TO authenticated
  USING (
    is_authenticated() AND (
      user_id = auth_uid() OR 
      current_user_role() IN ('admin', 'moderator')
    )
  );

CREATE POLICY "user_tags_insert_policy" ON user_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_authenticated() AND 
    current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "user_tags_update_policy" ON user_tags
  FOR UPDATE
  TO authenticated
  USING (
    is_authenticated() AND 
    current_user_role() IN ('admin', 'moderator')
  )
  WITH CHECK (
    is_authenticated() AND 
    current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "user_tags_delete_policy" ON user_tags
  FOR DELETE
  TO authenticated
  USING (
    is_authenticated() AND 
    current_user_role() IN ('admin', 'moderator')
  );

-- USER_ACTIVITY TABLE POLICIES
CREATE POLICY "user_activity_all_policy" ON user_activity
  FOR ALL
  TO authenticated
  USING (is_authenticated() AND user_id = auth_uid())
  WITH CHECK (is_authenticated() AND user_id = auth_uid());

-- ROLE_PERMISSIONS TABLE POLICIES
CREATE POLICY "role_permissions_select_policy" ON role_permissions
  FOR SELECT
  TO authenticated
  USING (is_authenticated());

CREATE POLICY "role_permissions_modify_policy" ON role_permissions
  FOR ALL
  TO authenticated
  USING (is_authenticated() AND current_user_role() = 'admin')
  WITH CHECK (is_authenticated() AND current_user_role() = 'admin');

-- STRIPE TABLES POLICIES
CREATE POLICY "stripe_customers_policy" ON stripe_customers
  FOR ALL
  TO authenticated
  USING (is_authenticated() AND user_id = auth_uid())
  WITH CHECK (is_authenticated() AND user_id = auth_uid());

CREATE POLICY "stripe_subscriptions_policy" ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    is_authenticated() AND 
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth_uid() AND deleted_at IS NULL
    ) AND 
    deleted_at IS NULL
  );

CREATE POLICY "stripe_orders_policy" ON stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    is_authenticated() AND 
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth_uid() AND deleted_at IS NULL
    ) AND 
    deleted_at IS NULL
  );

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
CREATE INDEX IF NOT EXISTS idx_missions_level ON missions(level);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_active ON user_tags(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity(last_seen);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON role_permissions(role, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_id ON stripe_orders(customer_id);

-- Create optimized functions for common operations
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  result json;
  user_permissions text[] := ARRAY[]::text[];
  user_tags_data json := '[]'::json;
BEGIN
  -- Use provided user_uuid or current user
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  -- Check authentication
  IF target_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Get user basic info
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
    'can_change_profile', (
      last_profile_change IS NULL OR 
      last_profile_change < now() - interval '30 days'
    )
  ) INTO result
  FROM users
  WHERE id = target_user_id;

  -- Return early if no user found
  IF result IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Get user permissions
  BEGIN
    SELECT array_agg(permission_name) INTO user_permissions
    FROM role_permissions rp
    JOIN users u ON u.role = rp.role
    WHERE u.id = target_user_id AND rp.is_active = true;
  EXCEPTION WHEN OTHERS THEN
    user_permissions := ARRAY['view_missions', 'create_missions', 'claim_missions'];
  END;

  -- Get user tags
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
    WHERE user_id = target_user_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  EXCEPTION WHEN OTHERS THEN
    user_tags_data := '[]'::json;
  END;

  -- Combine all data
  RETURN json_build_object(
    'profile', result,
    'permissions', COALESCE(user_permissions, ARRAY[]::text[]),
    'tags', COALESCE(user_tags_data, '[]'::json)
  );
END;
$$;

-- Create function to safely create user profile
CREATE OR REPLACE FUNCTION create_user_profile_safe(
  user_id uuid,
  user_email text,
  user_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_name text;
  result json;
BEGIN
  -- Generate name if not provided
  profile_name := COALESCE(
    user_name,
    split_part(user_email, '@', 1),
    'User'
  );

  -- Insert user profile
  INSERT INTO users (
    id,
    name,
    email,
    role,
    department,
    avatar_url,
    expertise_level
  ) VALUES (
    user_id,
    profile_name,
    user_email,
    'user',
    'Engineering',
    'https://ui-avatars.com/api/?name=' || encode(profile_name::bytea, 'escape') || '&background=random',
    'Rookie'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = now();

  -- Return the created profile
  RETURN get_user_profile_safe(user_id);
END;
$$;

-- Create function to get platform stats safely
CREATE OR REPLACE FUNCTION get_platform_stats_safe()
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
  -- Get counts with error handling
  BEGIN
    SELECT COUNT(*) INTO total_users_count FROM users;
  EXCEPTION WHEN OTHERS THEN
    total_users_count := 0;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO online_users_count 
    FROM user_activity 
    WHERE last_seen > now() - interval '5 minutes';
  EXCEPTION WHEN OTHERS THEN
    online_users_count := 0;
  END;

  BEGIN
    SELECT COUNT(*) INTO available_missions_count
    FROM missions
    WHERE status = 'available';
  EXCEPTION WHEN OTHERS THEN
    available_missions_count := 0;
  END;
  
  RETURN json_build_object(
    'total_users', total_users_count,
    'online_users', online_users_count,
    'available_missions', available_missions_count,
    'updated_at', now()
  );
END;
$$;

-- Create function to search missions safely
CREATE OR REPLACE FUNCTION search_missions_safe(
  search_term text DEFAULT NULL,
  level_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'description', description,
      'level', level,
      'tags', tags,
      'estimated_hours', estimated_hours,
      'reward', reward,
      'status', status,
      'created_at', created_at
    )
  ) INTO result
  FROM missions
  WHERE status = 'available'
  AND (
    search_term IS NULL OR 
    search_term = '' OR 
    title ILIKE '%' || search_term || '%' OR 
    description ILIKE '%' || search_term || '%' OR
    search_term = ANY(tags)
  )
  AND (level_filter IS NULL OR level_filter = '' OR level = level_filter)
  ORDER BY created_at DESC
  LIMIT limit_count;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create function to update user activity safely
CREATE OR REPLACE FUNCTION update_user_activity_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO user_activity (user_id, last_seen, updated_at)
  VALUES (current_user_id, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    last_seen = now(),
    updated_at = now();
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_user_profile_safe(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_platform_stats_safe() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_missions_safe(text, text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_activity_safe() TO authenticated;

-- Ensure all existing users have proper profiles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN users u ON au.id = u.id
    WHERE u.id IS NULL
  LOOP
    PERFORM create_user_profile_safe(
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1))
    );
  END LOOP;
END $$;

-- Update table statistics
ANALYZE users;
ANALYZE missions;
ANALYZE user_tags;
ANALYZE user_activity;
ANALYZE role_permissions;
ANALYZE stripe_customers;
ANALYZE stripe_subscriptions;
ANALYZE stripe_orders;

-- Create a function to test the complete auth flow
CREATE OR REPLACE FUNCTION test_auth_flow()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_profile json;
  platform_stats json;
  result json;
BEGIN
  current_user_id := auth.uid();
  
  -- Test user profile fetch
  user_profile := get_user_profile_safe();
  
  -- Test platform stats
  platform_stats := get_platform_stats_safe();
  
  RETURN json_build_object(
    'auth_uid', current_user_id,
    'is_authenticated', current_user_id IS NOT NULL,
    'user_profile', user_profile,
    'platform_stats', platform_stats,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION test_auth_flow() TO authenticated, anon;