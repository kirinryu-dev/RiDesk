/*
  # Database Performance Optimization

  1. Foreign Key Indexes
    - Add missing indexes for all foreign key columns
    - Improve join performance and referential integrity checks

  2. Composite Indexes
    - Create optimized indexes for common query patterns
    - Improve filtering and sorting performance

  3. Performance Functions
    - Add utility functions for monitoring and optimization
    - Create efficient query functions for common operations

  4. Statistics Updates
    - Update table statistics for better query planning
    - Add maintenance functions for ongoing optimization
*/

-- Add missing indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id_fk 
ON user_tags(user_id);

CREATE INDEX IF NOT EXISTS idx_user_tags_granted_by_fk 
ON user_tags(granted_by);

CREATE INDEX IF NOT EXISTS idx_missions_created_by_fk 
ON missions(created_by);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id_fk 
ON user_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id_fk 
ON stripe_customers(user_id);

-- Remove duplicate indexes if they exist
DO $$
DECLARE
    index_record RECORD;
BEGIN
    -- Remove duplicate user_tags indexes if they exist
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'user_tags' 
        AND indexname LIKE 'idx_user_tags_user_id%'
        AND indexname != 'idx_user_tags_user_id_fk'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
    END LOOP;

    -- Remove duplicate missions indexes if they exist
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'missions' 
        AND indexname LIKE 'idx_missions_created_by%'
        AND indexname != 'idx_missions_created_by_fk'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
    END LOOP;
END $$;

-- Create composite indexes for common query patterns (without function calls in predicates)

-- Index for active user tags
CREATE INDEX IF NOT EXISTS idx_user_tags_active_lookup 
ON user_tags(user_id, is_active, expires_at);

-- Index for available missions
CREATE INDEX IF NOT EXISTS idx_missions_available_recent 
ON missions(status, created_at DESC);

-- Index for missions by level and status
CREATE INDEX IF NOT EXISTS idx_missions_level_status 
ON missions(level, status);

-- Index for active role permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_active_lookup 
ON role_permissions(role, is_active, permission_name);

-- Index for user activity (without time-based predicate)
CREATE INDEX IF NOT EXISTS idx_user_activity_recent 
ON user_activity(last_seen DESC);

-- Text search indexes for missions
CREATE INDEX IF NOT EXISTS idx_missions_title_search 
ON missions USING gin(to_tsvector('english', title));

-- Array search index for mission tags
CREATE INDEX IF NOT EXISTS idx_missions_tags_search 
ON missions USING gin(tags);

-- Stripe table indexes
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_status 
ON stripe_subscriptions(customer_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_status 
ON stripe_orders(customer_id, status, deleted_at);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_users_role_department 
ON users(role, department);

CREATE INDEX IF NOT EXISTS idx_users_expertise_level 
ON users(expertise_level);

-- Remove any nonsensical indexes that might exist
DROP INDEX IF EXISTS idx_missions_user_activity;
DROP INDEX IF EXISTS idx_users_user_tags;
DROP INDEX IF EXISTS idx_user_tags_roles;
DROP INDEX IF EXISTS idx_roles_permission;

-- Create function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    num_rows bigint,
    table_size text,
    index_size text,
    unique_index boolean,
    number_of_scans bigint,
    tuples_read bigint,
    tuples_fetched bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        schemaname::text,
        tablename::text,
        indexname::text,
        pg_class.reltuples::bigint as num_rows,
        pg_size_pretty(pg_total_relation_size(pg_class.oid))::text as table_size,
        pg_size_pretty(pg_total_relation_size(indexrelid))::text as index_size,
        indisunique as unique_index,
        idx_scan as number_of_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    JOIN pg_index ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
    JOIN pg_class ON pg_stat_user_indexes.relid = pg_class.oid
    WHERE schemaname = 'public'
    ORDER BY number_of_scans DESC;
$$;

-- Create function to check foreign key performance
CREATE OR REPLACE FUNCTION check_foreign_key_indexes()
RETURNS TABLE(
    table_name text,
    column_name text,
    foreign_table text,
    foreign_column text,
    has_index boolean,
    index_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        tc.table_name::text,
        kcu.column_name::text,
        ccu.table_name::text as foreign_table,
        ccu.column_name::text as foreign_column,
        EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE tablename = tc.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
        ) as has_index,
        (
            SELECT indexname FROM pg_indexes 
            WHERE tablename = tc.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
            LIMIT 1
        )::text as index_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_index_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION check_foreign_key_indexes() TO authenticated;

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE missions;
ANALYZE user_tags;
ANALYZE user_activity;
ANALYZE role_permissions;
ANALYZE stripe_customers;
ANALYZE stripe_subscriptions;
ANALYZE stripe_orders;

-- Create a maintenance function to keep statistics up to date
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update statistics for all main tables
    ANALYZE users;
    ANALYZE missions;
    ANALYZE user_tags;
    ANALYZE user_activity;
    ANALYZE role_permissions;
    ANALYZE stripe_customers;
    ANALYZE stripe_subscriptions;
    ANALYZE stripe_orders;
    
    -- Log the update
    RAISE NOTICE 'Table statistics updated at %', clock_timestamp();
END;
$$;

GRANT EXECUTE ON FUNCTION update_table_statistics() TO authenticated;

-- Create optimized function to get user missions
CREATE OR REPLACE FUNCTION get_user_missions_optimized(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
BEGIN
    -- Get the current user ID if not provided
    IF user_uuid IS NULL THEN
        target_user_id := auth.uid();
    ELSE
        target_user_id := user_uuid;
    END IF;
    
    -- Check authentication
    IF target_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Use the optimized index for this query
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'description', description,
            'level', level,
            'status', status,
            'reward', reward,
            'estimated_hours', estimated_hours,
            'created_at', created_at
        )
    ) INTO result
    FROM missions
    WHERE created_by = target_user_id
    ORDER BY created_at DESC
    LIMIT 50;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create optimized function to search missions
CREATE OR REPLACE FUNCTION search_missions_optimized(
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
    -- Use optimized query with proper indexes
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'description', description,
            'level', level,
            'tags', tags,
            'estimated_hours', estimated_hours,
            'reward', reward,
            'created_at', created_at
        )
    ) INTO result
    FROM missions
    WHERE status = 'available'
    AND (search_term IS NULL OR search_term = '' OR 
         title ILIKE '%' || search_term || '%' OR 
         search_term = ANY(tags))
    AND (level_filter IS NULL OR level_filter = '' OR level = level_filter)
    ORDER BY created_at DESC
    LIMIT limit_count;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_missions_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_missions_optimized(text, text, integer) TO authenticated;

-- Create function to get platform statistics efficiently
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    total_users_count bigint;
    online_users_count bigint;
    available_missions_count bigint;
    total_missions_count bigint;
    five_minutes_ago timestamp with time zone;
BEGIN
    -- Calculate timestamp once
    five_minutes_ago := clock_timestamp() - interval '5 minutes';
    
    -- Get total users count
    SELECT COUNT(*) INTO total_users_count FROM users;
    
    -- Get online users (active in last 5 minutes)
    SELECT COUNT(*) INTO online_users_count 
    FROM user_activity 
    WHERE last_seen > five_minutes_ago;
    
    -- Get available missions count
    SELECT COUNT(*) INTO available_missions_count 
    FROM missions 
    WHERE status = 'available';
    
    -- Get total missions count
    SELECT COUNT(*) INTO total_missions_count FROM missions;
    
    -- Build result
    SELECT json_build_object(
        'total_users', total_users_count,
        'online_users', online_users_count,
        'available_missions', available_missions_count,
        'total_missions', total_missions_count,
        'updated_at', clock_timestamp()
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- Create function to update user last seen efficiently
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    current_time timestamp with time zone;
BEGIN
    current_user_id := auth.uid();
    current_time := clock_timestamp();
    
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Use UPSERT for efficiency
    INSERT INTO user_activity (user_id, last_seen, updated_at)
    VALUES (current_user_id, current_time, current_time)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        last_seen = current_time,
        updated_at = current_time;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_last_seen() TO authenticated;

-- Create comprehensive index report function
CREATE OR REPLACE FUNCTION get_index_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'foreign_key_indexes', (
            SELECT json_agg(
                json_build_object(
                    'table', table_name,
                    'column', column_name,
                    'has_index', has_index,
                    'index_name', index_name
                )
            )
            FROM check_foreign_key_indexes()
        ),
        'index_usage', (
            SELECT json_agg(
                json_build_object(
                    'table', tablename,
                    'index', indexname,
                    'scans', number_of_scans,
                    'size', index_size
                )
            )
            FROM analyze_index_usage()
            WHERE number_of_scans > 0
        ),
        'table_sizes', (
            SELECT json_agg(
                json_build_object(
                    'table', tablename,
                    'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
                )
            )
            FROM pg_tables
            WHERE schemaname = 'public'
        )
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_index_report() TO authenticated;

-- Create function to clean up old user activity records
CREATE OR REPLACE FUNCTION cleanup_old_user_activity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
    thirty_days_ago timestamp with time zone;
BEGIN
    thirty_days_ago := clock_timestamp() - interval '30 days';
    
    -- Delete user activity records older than 30 days
    DELETE FROM user_activity 
    WHERE last_seen < thirty_days_ago;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_user_activity() TO authenticated;

-- Create function to get user profile with optimized queries
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
    user_permissions text[];
    user_tags_data json;
    current_time timestamp with time zone;
    thirty_days_ago timestamp with time zone;
BEGIN
    current_time := clock_timestamp();
    thirty_days_ago := current_time - interval '30 days';
    
    -- Get the current user ID if not provided
    IF user_uuid IS NULL THEN
        target_user_id := auth.uid();
    ELSE
        target_user_id := user_uuid;
    END IF;
    
    -- Check authentication
    IF target_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Get user permissions
    SELECT array_agg(rp.permission_name) INTO user_permissions
    FROM users u
    JOIN role_permissions rp ON u.role = rp.role
    WHERE u.id = target_user_id AND rp.is_active = true;

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
    WHERE user_id = target_user_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > current_time);

    -- Get user profile with all data
    SELECT json_build_object(
        'profile', row_to_json(u.*),
        'permissions', COALESCE(user_permissions, ARRAY[]::text[]),
        'tags', COALESCE(user_tags_data, '[]'::json),
        'can_change_profile', (
            u.last_profile_change IS NULL OR 
            u.last_profile_change < thirty_days_ago
        )
    ) INTO result
    FROM users u
    WHERE u.id = target_user_id;

    RETURN COALESCE(result, json_build_object('error', 'User not found'));
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;

-- Create helper functions for common auth operations
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.uid() IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated;

-- Create function for efficient mission claiming
CREATE OR REPLACE FUNCTION claim_mission(
    mission_id uuid,
    pr_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    mission_status text;
    result json;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;
    
    -- Check if mission exists and is available
    SELECT status INTO mission_status
    FROM missions
    WHERE id = mission_id;
    
    IF mission_status IS NULL THEN
        RETURN json_build_object('error', 'Mission not found');
    END IF;
    
    IF mission_status != 'available' THEN
        RETURN json_build_object('error', 'Mission is not available');
    END IF;
    
    -- Update mission status to claimed
    UPDATE missions 
    SET status = 'claimed', updated_at = clock_timestamp()
    WHERE id = mission_id AND status = 'available';
    
    -- Check if update was successful (handles race conditions)
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Mission was claimed by another user');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Mission claimed successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION claim_mission(uuid, text) TO authenticated;

-- Create function to get user role and permissions efficiently
CREATE OR REPLACE FUNCTION get_user_role_info(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
BEGIN
    IF user_uuid IS NULL THEN
        target_user_id := auth.uid();
    ELSE
        target_user_id := user_uuid;
    END IF;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;
    
    SELECT json_build_object(
        'user_id', u.id,
        'role', u.role,
        'permissions', COALESCE(
            (SELECT array_agg(rp.permission_name)
             FROM role_permissions rp 
             WHERE rp.role = u.role AND rp.is_active = true),
            ARRAY[]::text[]
        ),
        'tags', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'tag_name', ut.tag_name,
                    'tag_value', ut.tag_value
                )
             )
             FROM user_tags ut 
             WHERE ut.user_id = u.id 
             AND ut.is_active = true 
             AND (ut.expires_at IS NULL OR ut.expires_at > clock_timestamp())),
            '[]'::json
        )
    ) INTO result
    FROM users u
    WHERE u.id = target_user_id;
    
    RETURN COALESCE(result, json_build_object('error', 'User not found'));
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_role_info(uuid) TO authenticated;