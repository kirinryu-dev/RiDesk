/*
  # Create missions table and related schemas

  1. New Tables
    - missions
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - repository (text)
      - level (text)
      - tags (text[])
      - estimated_hours (integer)
      - reward (integer)
      - status (text)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS on missions table
    - Add policies for:
      - Anyone can view available missions
      - Authenticated users can create missions
      - Users can only update their own missions
*/

CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  repository text NOT NULL,
  level text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  estimated_hours integer NOT NULL,
  reward integer NOT NULL,
  status text NOT NULL DEFAULT 'available',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view available missions
CREATE POLICY "Anyone can view available missions"
  ON missions
  FOR SELECT
  USING (status = 'available');

-- Policy: Authenticated users can create missions
CREATE POLICY "Authenticated users can create missions"
  ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own missions
CREATE POLICY "Users can update their own missions"
  ON missions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);