/*
  # User Roles and Permissions System

  1. New Tables
    - `users` - Extended user profiles with roles and permissions
    - `user_tags` - Special access tags for users
    - `role_permissions` - Permission definitions for each role

  2. Security
    - Enable RLS on all new tables
    - Add policies for role-based access control
    - Functions for user management and tag assignment

  3. Data Migration
    - Safely handle existing mission references
    - Create default admin user if needed
*/

-- Create user roles enum
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create users table for extended profiles
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role user_role_type NOT NULL DEFAULT 'user',
  department text DEFAULT 'Engineering',
  avatar_url text,
  bio text,
  expertise_level text DEFAULT 'Rookie',
  github_username text,
  gitlab_username text,
  discord_username text,
  last_profile_change timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user tags table
CREATE TABLE IF NOT EXISTS user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  tag_value text,
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role_type NOT NULL,
  permission_name text NOT NULL,
  permission_description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_name)
);

-- Migrate existing auth users to users table
INSERT INTO users (id, name, email, role, avatar_url)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  au.email,
  CASE 
    WHEN au.email LIKE '%admin%' THEN 'admin'::user_role_type
    ELSE 'user'::user_role_type
  END as role,
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    'https://ui-avatars.com/api/?name=' || split_part(au.email, '@', 1) || '&background=random'
  ) as avatar_url
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Handle orphaned missions by creating placeholder users or removing them
DO $$
DECLARE
  orphaned_mission RECORD;
BEGIN
  -- For each mission with a non-existent created_by, try to create a placeholder user
  FOR orphaned_mission IN 
    SELECT DISTINCT m.created_by 
    FROM missions m 
    LEFT JOIN users u ON m.created_by = u.id 
    WHERE u.id IS NULL AND m.created_by IS NOT NULL
  LOOP
    -- Try to find the user in auth.users first
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = orphaned_mission.created_by) THEN
      -- User exists in auth but not in users table, migrate them
      INSERT INTO users (id, name, email, role)
      SELECT 
        id,
        COALESCE(raw_user_meta_data->>'name', 'Unknown User'),
        COALESCE(email, 'unknown@example.com'),
        'user'::user_role_type
      FROM auth.users 
      WHERE id = orphaned_mission.created_by
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- User doesn't exist anywhere, delete the orphaned missions
      DELETE FROM missions WHERE created_by = orphaned_mission.created_by;
    END IF;
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (last_profile_change IS NULL OR last_profile_change < now() - interval '30 days')
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON users;
CREATE POLICY "Admins can update any profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "New users can insert their profile" ON users;
CREATE POLICY "New users can insert their profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User tags policies
DROP POLICY IF EXISTS "Users can view their own tags" ON user_tags;
CREATE POLICY "Users can view their own tags"
  ON user_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all tags" ON user_tags;
CREATE POLICY "Admins can view all tags"
  ON user_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and moderators can manage tags" ON user_tags;
CREATE POLICY "Admins and moderators can manage tags"
  ON user_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Role permissions policies
DROP POLICY IF EXISTS "Everyone can view role permissions" ON role_permissions;
CREATE POLICY "Everyone can view role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage role permissions" ON role_permissions;
CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_name, permission_description) VALUES
-- Admin permissions
('admin', 'manage_users', 'Can manage all user accounts and roles'),
('admin', 'manage_missions', 'Can manage all missions'),
('admin', 'view_analytics', 'Can view platform analytics'),
('admin', 'manage_tags', 'Can assign and remove user tags'),
('admin', 'system_settings', 'Can modify system settings'),

-- Moderator permissions
('moderator', 'moderate_missions', 'Can moderate and approve missions'),
('moderator', 'view_reports', 'Can view user reports and analytics'),
('moderator', 'manage_tags', 'Can assign basic user tags'),

-- User permissions (default)
('user', 'create_missions', 'Can create new missions'),
('user', 'claim_missions', 'Can claim available missions'),
('user', 'view_missions', 'Can view available missions'),
('user', 'view_profile', 'Can view own profile')
ON CONFLICT (role, permission_name) DO NOTHING;

-- Function to get user with role and permissions
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data json;
  user_permissions text[];
  user_tags_data json;
BEGIN
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
    'can_change_profile', (last_profile_change IS NULL OR last_profile_change < now() - interval '30 days')
  ) INTO user_data
  FROM users
  WHERE id = user_uuid;

  -- Get user permissions
  SELECT array_agg(permission_name) INTO user_permissions
  FROM role_permissions rp
  JOIN users u ON u.role = rp.role
  WHERE u.id = user_uuid AND rp.is_active = true;

  -- Get user tags
  SELECT json_agg(
    json_build_object(
      'tag_name', tag_name,
      'tag_value', tag_value,
      'granted_at', granted_at,
      'expires_at', expires_at
    )
  ) INTO user_tags_data
  FROM user_tags
  WHERE user_id = user_uuid AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());

  -- Combine all data
  RETURN json_build_object(
    'profile', user_data,
    'permissions', COALESCE(user_permissions, ARRAY[]::text[]),
    'tags', COALESCE(user_tags_data, '[]'::json)
  );
END;
$$;

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role user_role_type)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role_type;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();

  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  -- Update the target user's role
  UPDATE users
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

-- Function to assign tag to user
CREATE OR REPLACE FUNCTION assign_user_tag(
  target_user_id uuid,
  tag_name text,
  tag_value text DEFAULT NULL,
  expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role_type;
  tag_id uuid;
BEGIN
  -- Check if current user can assign tags
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Only admins and moderators can assign tags';
  END IF;

  -- Deactivate existing tag with same name for this user
  UPDATE user_tags 
  SET is_active = false 
  WHERE user_id = target_user_id AND tag_name = assign_user_tag.tag_name;

  -- Insert the new tag
  INSERT INTO user_tags (user_id, tag_name, tag_value, granted_by, expires_at)
  VALUES (target_user_id, tag_name, tag_value, auth.uid(), expires_at)
  RETURNING id INTO tag_id;

  RETURN tag_id;
END;
$$;

-- Function to get platform stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users_count integer;
  online_users_count integer;
  result json;
BEGIN
  -- Get total users count
  SELECT COUNT(*) INTO total_users_count FROM users;
  
  -- Get online users count (users active in last 5 minutes)
  SELECT COUNT(*) INTO online_users_count 
  FROM user_activity 
  WHERE last_seen > now() - interval '5 minutes';
  
  -- Build result
  SELECT json_build_object(
    'total_users', total_users_count,
    'online_users', online_users_count
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to update user last seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity (user_id, last_seen)
  VALUES (auth.uid(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_seen = now(),
    updated_at = now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(uuid, user_role_type) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_tag(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_seen() TO authenticated;

-- Now safely add the foreign key constraint to missions table
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'missions_created_by_fkey'
  ) THEN
    ALTER TABLE missions DROP CONSTRAINT missions_created_by_fkey;
  END IF;

  -- Add the new constraint
  ALTER TABLE missions
  ADD CONSTRAINT missions_created_by_users_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id);
END $$;