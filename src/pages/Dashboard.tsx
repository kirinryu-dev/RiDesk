import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Calendar, 
  Users, 
  Activity,
  Clock,
  CheckCircle2
} from 'lucide-react';

// Components
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import UpcomingReservations from '../components/UpcomingReservations';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="mt-1 text-gray-600">Here's what's happening with your reservations today.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Desks"
          value="12"
          icon={<Building2 className="h-6 w-6 text-blue-600" />}
          change="+2"
          changeType="increase"
        />
        <StatsCard
          title="Your Reservations"
          value="3"
          icon={<Calendar className="h-6 w-6 text-teal-600" />}
          change="-1"
          changeType="decrease"
        />
        <StatsCard
          title="Total Users"
          value="128"
          icon={<Users className="h-6 w-6 text-amber-600" />}
          change="+5"
          changeType="increase"
        />
        <StatsCard
          title="Utilization Rate"
          value="76%"
          icon={<Activity className="h-6 w-6 text-purple-600" />}
          change="+4%"
          changeType="increase"
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
                <p className="text-sm text-gray-500">Your recent actions and notifications</p>
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
                <CheckCircle2 className="h-6 w-6 text-gray-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Reservations</h3>
                <p className="text-sm text-gray-500">Your scheduled desk reservations</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <UpcomingReservations />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h3 className="text-lg font-medium text-gray-900">Floor Map</h3>
          <p className="text-sm text-gray-500">Currently available resources</p>
        </div>
        <div className="p-5 border-t border-gray-200">
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Floor map visualization would appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;