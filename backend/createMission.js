import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function createMission(req, res) {
  try {
    const {
      title,
      description,
      repository,
      level,
      tags,
      estimatedHours,
      reward,
    } = req.body;

    const { data: mission, error } = await supabase
      .from('missions')
      .insert([
        {
          title,
          description,
          repository,
          level,
          tags,
          estimated_hours: estimatedHours,
          reward,
          status: 'available',
          created_by: req.user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(mission);
  } catch (error) {
    console.error('Error creating mission:', error);
    return res.status(500).json({ error: 'Failed to create mission' });
  }
}