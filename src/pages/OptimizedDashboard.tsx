import React from 'react';
import { useAuth } from '../context/OptimizedAuthContext';
import { useUserActivity } from '../hooks/useUserActivity';
import { usePlatformStats, useUserStats } from '../hooks/useOptimizedQuery';
import { 
  Code2, 
  Users, 
  Activity,
  Target,
  Clock,
  Globe
} from 'lucide-react';

// Components
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import PlatformUpdates from '../components/PlatformUpdates';
import AvailableResources from '../components/AvailableResources';
import SubscriptionStatus from '../components/SubscriptionStatus';
import DatabasePerformanceMonitor from '../components/DatabasePerformanceMonitor';

const OptimizedDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Track user activity
  useUserActivity();

  // Use optimized queries
  const { data: platformStats, isLoading: platformLoading } = usePlatformStats();
  const { data: userStats, isLoading: userStatsLoading } = useUserStats(user?.id);

  const stats = {
    availableMissions: platformStats?.available_missions || 0,
    userMissions: userStats?.created_missions || 0,
    totalUsers: platformStats?.total_users || 0,
    onlineUsers: platformStats?.online_users || 0,
    completedMissions: userStats?.completed_missions || 0
  };

  const isLoading = platformLoading || userStatsLoading;

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Missions"
          value={isLoading ? '...' : stats.availableMissions.toString()}
          icon={<Code2 className="h-6 w-6 text-blue-600" />}
        />
        <StatsCard
          title="Your Missions"
          value={isLoading ? '...' : stats.userMissions.toString()}
          icon={<Target className="h-6 w-6 text-teal-600" />}
        />
        <StatsCard
          title="Platform Users"
          value={isLoading ? '...' : stats.totalUsers.toString()}
          icon={<Users className="h-6 w-6 text-amber-600" />}
          tooltip="Online users"
          onlineCount={stats.onlineUsers}
        />
        <StatsCard
          title="Completed Missions"
          value={isLoading ? '...' : stats.completedMissions.toString()}
          icon={<Activity className="h-6 w-6 text-purple-600" />}
        />
      </div>

      {/* Activity and Updates Grid */}
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

      {/* Resources Section */}
      <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h3 className="text-lg font-medium text-gray-900">Available Resources</h3>
          <p className="text-sm text-gray-500">Platform resources and tools</p>
        </div>
        <div className="p-5 border-t border-gray-200">
          <AvailableResources />
        </div>
      </div>

      {/* Database Performance Monitor (only for admins in development) */}
      {user?.role === 'admin' && import.meta.env.DEV && (
        <DatabasePerformanceMonitor />
      )}
    </div>
  );
};

export default OptimizedDashboard;