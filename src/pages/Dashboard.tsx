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

interface DashboardStats {
  availableMissions: number;
  acceptedMissions: number;
  totalUsers: number;
  onlineUsers: number;
  utilizationRate: number;
  userPRs: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    availableMissions: 0,
    acceptedMissions: 0,
    totalUsers: 0,
    onlineUsers: 0,
    utilizationRate: 0,
    userPRs: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch available missions count
        const missionsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?select=count&status=eq.available`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact'
          }
        });

        // Fetch user's accepted missions
        const userMissionsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?select=count&created_by=eq.${user?.id}`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact'
          }
        });

        // Mock data for other stats (would come from real API endpoints)
        setStats({
          availableMissions: 12, // Would be from missions count
          acceptedMissions: 3,   // User's active missions
          totalUsers: 128,       // Total platform users
          onlineUsers: 24,       // Currently online users
          utilizationRate: 76,   // PR completion rate
          userPRs: 8            // User's total PRs
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user?.id]);

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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Missions"
          value={stats.availableMissions.toString()}
          icon={<Code2 className="h-6 w-6 text-blue-600" />}
          change="+3"
          changeType="increase"
        />
        <StatsCard
          title="Your Accepted Missions"
          value={stats.acceptedMissions.toString()}
          icon={<Target className="h-6 w-6 text-teal-600" />}
          change="+1"
          changeType="increase"
        />
        <div className="relative">
          <StatsCard
            title="Platform Users"
            value={stats.totalUsers.toString()}
            icon={<Users className="h-6 w-6 text-amber-600" />}
            change="+5"
            changeType="increase"
          />
          <div className="absolute top-2 right-2 group">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="invisible group-hover:visible absolute right-0 top-4 w-32 bg-black text-white text-xs rounded py-1 px-2 z-10">
              {stats.onlineUsers} users online
            </div>
          </div>
        </div>
        <div className="relative">
          <StatsCard
            title="Utilization Rate"
            value={`${stats.utilizationRate}%`}
            icon={<Activity className="h-6 w-6 text-purple-600" />}
            change="+4%"
            changeType="increase"
          />
          <div className="absolute top-2 right-2 group">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <div className="invisible group-hover:visible absolute right-0 top-5 w-40 bg-black text-white text-xs rounded py-1 px-2 z-10">
              {stats.userPRs} PRs per user average
            </div>
          </div>
        </div>
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