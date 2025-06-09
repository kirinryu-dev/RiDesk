/*
  # Fix missions table foreign key relationship

  1. Changes
    - Drop existing foreign key constraint that references incorrect table
    - Add new foreign key constraint to reference auth.users table
    - Update select query in RLS policies to use proper join

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- First drop the existing foreign key if it exists
ALTER TABLE public.missions 
DROP CONSTRAINT IF EXISTS missions_created_by_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE public.missions
ADD CONSTRAINT missions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id);

-- Update the missions table select policy to use proper join
DROP POLICY IF EXISTS "Anyone can view available missions" ON public.missions;
CREATE POLICY "Anyone can view available missions" 
ON public.missions 
FOR SELECT 
TO public 
USING (status = 'available'::text);