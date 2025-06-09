import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Code2, Plus, GitPullRequest, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Activity {
  id: number;
  action: string;
  details: string;
  timestamp: Date;
  type: 'mission_posted' | 'mission_accepted' | 'mission_completed' | 'pr_submitted';
}

const RecentActivity: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        // In a real app, this would fetch from an activity log table
        // For now, we'll use mock data based on user actions
        const mockActivities: Activity[] = [
          {
            id: 1,
            action: 'Posted a mission',
            details: 'Implement OAuth Authentication - Expert Level',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            type: 'mission_posted'
          },
          {
            id: 2,
            action: 'Accepted mission',
            details: 'Fix Mobile Responsive Layout',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
            type: 'mission_accepted'
          },
          {
            id: 3,
            action: 'Submitted PR',
            details: 'Added unit tests for authentication module',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            type: 'pr_submitted'
          },
          {
            id: 4,
            action: 'Completed mission',
            details: 'Setup CI/CD Pipeline - $150 earned',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
            type: 'mission_completed'
          },
        ];

        setActivities(mockActivities);
      } catch (error) {
        console.error('Error fetching user activity:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivity();
  }, [user?.id]);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'mission_posted':
        return <Plus className="h-4 w-4 text-blue-600" />;
      case 'mission_accepted':
        return <Code2 className="h-4 w-4 text-green-600" />;
      case 'pr_submitted':
        return <GitPullRequest className="h-4 w-4 text-purple-600" />;
      case 'mission_completed':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      default:
        return <Code2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'mission_posted':
        return 'bg-blue-100 ring-blue-600';
      case 'mission_accepted':
        return 'bg-green-100 ring-green-600';
      case 'pr_submitted':
        return 'bg-purple-100 ring-purple-600';
      case 'mission_completed':
        return 'bg-emerald-100 ring-emerald-600';
      default:
        return 'bg-gray-100 ring-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
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