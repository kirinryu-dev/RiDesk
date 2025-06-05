import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function getUserStats(req, res) {
  const userId = req.params.userId || req.user.id;

  try {
    // Get completed missions count
    const { count: completedCount, error: completedError } = await supabase
      .from('claims')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (completedError) throw completedError;

    // Get active missions
    const { data: activeMissions, error: activeError } = await supabase
      .from('claims')
      .select(`
        *,
        mission:mission_id (
          title,
          level,
          reward
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (activeError) throw activeError;

    // Calculate total earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('claims')
      .select(`
        mission:mission_id (
          reward
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (earningsError) throw earningsError;

    const totalEarnings = earnings.reduce((sum, claim) => sum + claim.mission.reward, 0);

    // Calculate experience points (XP)
    const xpMultipliers = {
      Rookie: 100,
      Intermediate: 200,
      Advanced: 300,
      Expert: 400,
    };

    const totalXP = earnings.reduce((sum, claim) => {
      const baseXP = xpMultipliers[claim.mission.level] || 100;
      return sum + baseXP;
    }, 0);

    return res.status(200).json({
      completedMissions: completedCount,
      activeMissions,
      totalEarnings,
      experiencePoints: totalXP,
      level: calculateLevel(totalXP),
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
}

function calculateLevel(xp) {
  // Simple level calculation: every 1000 XP is a new level
  return Math.floor(xp / 1000) + 1;
}