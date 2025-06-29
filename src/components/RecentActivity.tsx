import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Code2, Plus, GitPullRequest, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/OptimizedAuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Activity {
  id: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'mission_posted' | 'mission_updated';
}

const RecentActivity: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserActivity = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user's recent missions as activity
        const { data: missions, error } = await supabase
          .from('missions')
          .select('id, title, created_at, updated_at, status')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching user activity:', error);
          return;
        }

        const activityData: Activity[] = missions?.map(mission => ({
          id: mission.id,
          action: 'Posted a mission',
          details: mission.title,
          timestamp: new Date(mission.created_at),
          type: 'mission_posted'
        })) || [];

        setActivities(activityData);
      } catch (error) {
        console.error('Error fetching user activity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivity();
  }, [user, accessToken]);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'mission_posted':
        return <Plus className="h-4 w-4 text-blue-600" />;
      case 'mission_updated':
        return <Code2 className="h-4 w-4 text-green-600" />;
      default:
        return <Code2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'mission_posted':
        return 'bg-blue-100 ring-blue-600';
      case 'mission_updated':
        return 'bg-green-100 ring-green-600';
      default:
        return 'bg-gray-100 ring-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <Code2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start by creating your first mission!
        </p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-900">
                      {activity.action}{' '}
                      <span className="font-medium text-gray-700">
                        {activity.details}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    {format(activity.timestamp, 'MMM dd, HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;