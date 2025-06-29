import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Code2, 
  Users, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  Globe,
  Target
} from 'lucide-react';

// Components
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import PlatformUpdates from '../components/PlatformUpdates';
import AvailableResources from '../components/AvailableResources';
import SubscriptionStatus from '../components/SubscriptionStatus';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface DashboardStats {
  availableMissions: number;
  userMissions: number;
  totalUsers: number;
  completedMissions: number;
}

const Dashboard: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    availableMissions: 0,
    userMissions: 0,
    totalUsers: 0,
    completedMissions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch available missions count
        const { count: availableMissionsCount } = await supabase
          .from('missions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'available');

        // Fetch user's created missions
        const { count: userMissionsCount } = await supabase
          .from('missions')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        // Note: We can't get total users count from auth.users due to RLS
        // This would need to be implemented via a secure function or admin view
        
        setStats({
          availableMissions: availableMissionsCount || 0,
          userMissions: userMissionsCount || 0,
          totalUsers: 0, // Would need admin function to get this
          completedMissions: 0 // Would need claims table to track this
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user, accessToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="mt-1 text-gray-600">Here's your mission control dashboard.</p>
      </div>

      {/* Subscription Status */}
      <div className="mb-6">
        <SubscriptionStatus />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Missions"
          value={stats.availableMissions.toString()}
          icon={<Code2 className="h-6 w-6 text-blue-600" />}
        />
        <StatsCard
          title="Your Missions"
          value={stats.userMissions.toString()}
          icon={<Target className="h-6 w-6 text-teal-600" />}
        />
        <StatsCard
          title="Platform Users"
          value="--"
          icon={<Users className="h-6 w-6 text-amber-600" />}
        />
        <StatsCard
          title="Completed Missions"
          value={stats.completedMissions.toString()}
          icon={<Activity className="h-6 w-6 text-purple-600" />}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-500">Your mission activity log</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <RecentActivity />
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-6 w-6 text-gray-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Platform Updates</h3>
                <p className="text-sm text-gray-500">Latest global platform updates</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <PlatformUpdates />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h3 className="text-lg font-medium text-gray-900">Available Resources</h3>
          <p className="text-sm text-gray-500">Platform resources and tools</p>
        </div>
        <div className="p-5 border-t border-gray-200">
          <AvailableResources />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;