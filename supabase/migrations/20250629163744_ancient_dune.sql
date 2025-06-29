/*
  # Fix Database Indexes and Foreign Key Performance Issues

  1. Index Management
    - Add missing indexes for foreign keys
    - Remove unused indexes
    - Optimize existing indexes for better performance

  2. Foreign Key Optimization
    - Add proper indexes for all foreign key columns
    - Ensure referential integrity performance

  3. Query Performance
    - Add composite indexes for common query patterns
    - Optimize RLS policy performance with targeted indexes
*/

-- First, let's analyze and fix foreign key indexes

-- Add missing index for user_tags.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id_fk 
ON user_tags(user_id);

-- Add missing index for user_tags.granted_by foreign key
CREATE INDEX IF NOT EXISTS idx_user_tags_granted_by_fk 
ON user_tags(granted_by);

-- Add missing index for missions.created_by foreign key (if not exists)
CREATE INDEX IF NOT EXISTS idx_missions_created_by_fk 
ON missions(created_by);

-- Add missing index for user_activity.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id_fk 
ON user_activity(user_id);

-- Add missing indexes for stripe tables foreign keys
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id_fk 
ON stripe_customers(user_id);

-- Remove or optimize unused/redundant indexes

-- Check if we have duplicate indexes and remove redundant ones
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

-- Create optimized composite indexes for common query patterns

-- Composite index for active user tags (commonly queried together)
CREATE INDEX IF NOT EXISTS idx_user_tags_active_lookup 
ON user_tags(user_id, is_active, expires_at) 
WHERE is_active = true;

-- Composite index for available missions (status + created_at for ordering)
CREATE INDEX IF NOT EXISTS idx_missions_available_recent 
ON missions(status, created_at DESC) 
WHERE status = 'available';

-- Composite index for missions by level and status
CREATE INDEX IF NOT EXISTS idx_missions_level_status 
ON missions(level, status) 
WHERE status = 'available';

-- Composite index for role permissions lookup
CREATE INDEX IF NOT EXISTS idx_role_permissions_active_lookup 
ON role_permissions(role, is_active, permission_name) 
WHERE is_active = true;

-- Partial index for recent user activity (only last 24 hours)
CREATE INDEX IF NOT EXISTS idx_user_activity_recent 
ON user_activity(last_seen DESC) 
WHERE last_seen > now() - interval '24 hours';

-- Add indexes for text search on missions
CREATE INDEX IF NOT EXISTS idx_missions_title_search 
ON missions USING gin(to_tsvector('english', title)) 
WHERE status = 'available';

-- Add index for mission tags array search
CREATE INDEX IF NOT EXISTS idx_missions_tags_search 
ON missions USING gin(tags) 
WHERE status = 'available';

-- Optimize stripe table indexes
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_status 
ON stripe_subscriptions(customer_id, status, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_status 
ON stripe_orders(customer_id, status, deleted_at) 
WHERE deleted_at IS NULL;

-- Add indexes for user profile queries
CREATE INDEX IF NOT EXISTS idx_users_role_department 
ON users(role, department);

CREATE INDEX IF NOT EXISTS idx_users_expertise_level 
ON users(expertise_level);

-- Remove any unused indexes that might exist
DROP INDEX IF EXISTS idx_missions_user_activity; -- This doesn't make sense
DROP INDEX IF EXISTS idx_users_user_tags; -- This doesn't make sense
DROP INDEX IF EXISTS idx_user_tags_roles; -- This doesn't make sense
DROP INDEX IF EXISTS idx_roles_permission; -- This doesn't make sense

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
    RAISE NOTICE 'Table statistics updated at %', now();
END;
$$;

GRANT EXECUTE ON FUNCTION update_table_statistics() TO authenticated;

-- Create optimized queries for common operations

-- Optimized function to get user missions with proper indexing
CREATE OR REPLACE FUNCTION get_user_missions_optimized(user_uuid uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
BEGIN
    target_user_id := COALESCE(user_uuid, get_current_user_id());
    
    IF NOT is_authenticated() AND user_uuid IS NULL THEN
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

-- Optimized function to search missions
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
    query_text text;
BEGIN
    -- Build dynamic query based on filters
    query_text := 'SELECT json_agg(
        json_build_object(
            ''id'', id,
            ''title'', title,
            ''description'', description,
            ''level'', level,
            ''tags'', tags,
            ''estimated_hours'', estimated_hours,
            ''reward'', reward,
            ''created_at'', created_at
        )
    ) FROM missions WHERE status = ''available''';

    -- Add search filter if provided
    IF search_term IS NOT NULL AND search_term != '' THEN
        query_text := query_text || ' AND (title ILIKE ''%' || search_term || '%'' OR ''' || search_term || ''' = ANY(tags))';
    END IF;

    -- Add level filter if provided
    IF level_filter IS NOT NULL AND level_filter != '' THEN
        query_text := query_text || ' AND level = ''' || level_filter || '''';
    END IF;

    -- Add ordering and limit
    query_text := query_text || ' ORDER BY created_at DESC LIMIT ' || limit_count;

    -- Execute the query
    EXECUTE query_text INTO result;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_missions_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_missions_optimized(text, text, integer) TO authenticated;

-- Add a function to monitor query performance
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    rows bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
    FROM pg_stat_statements
    WHERE query LIKE '%missions%' OR query LIKE '%users%' OR query LIKE '%user_tags%'
    ORDER BY mean_time DESC
    LIMIT 20;
$$;

-- Only grant if pg_stat_statements is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Extension not available, skip
    NULL;
END $$;

-- Create a comprehensive index report
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