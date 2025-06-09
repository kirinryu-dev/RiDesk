import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function claimMission(req, res) {
  const { id } = req.params;
  const { pullRequestUrl } = req.body;

  try {
    // Start a transaction
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', id)
      .single();

    if (missionError) throw missionError;

    if (mission.status !== 'available') {
      return res.status(400).json({ error: 'Mission is not available' });
    }

    // Update mission status and create claim
    const { error: updateError } = await supabase
      .from('missions')
      .update({ status: 'claimed' })
      .eq('id', id);

    if (updateError) throw updateError;

    const { error: claimError } = await supabase
      .from('claims')
      .insert([
        {
          mission_id: id,
          user_id: req.user.id,
          pr_link: pullRequestUrl,
          status: 'pending',
        },
      ]);

    if (claimError) throw claimError;

    return res.status(200).json({ message: 'Mission claimed successfully' });
  } catch (error) {
    console.error('Error claiming mission:', error);
    return res.status(500).json({ error: 'Failed to claim mission' });
  }
}