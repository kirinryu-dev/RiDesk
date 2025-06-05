import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function getMissions(req, res) {
  try {
    const { data: missions, error } = await supabase
      .from('missions')
      .select(`
        *,
        created_by (
          id,
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(missions);
  } catch (error) {
    console.error('Error fetching missions:', error);
    return res.status(500).json({ error: 'Failed to fetch missions' });
  }
}