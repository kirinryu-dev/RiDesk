import React from 'react';
import { format } from 'date-fns';

const activities = [
  {
    id: 1,
    action: 'Reserved a desk',
    details: 'Desk A12 - Floor 3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: 2,
    action: 'Modified reservation',
    details: 'Changed from Desk B8 to B9',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
  },
  {
    id: 3,
    action: 'Cancelled reservation',
    details: 'Meeting Room C - Floor 2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: 4,
    action: 'Added to favorites',
    details: 'Desk A7 - Floor 3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];

const RecentActivity: React.FC = () => {
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
                  <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                    <span className="text-xs font-medium text-blue-600">
                      {activity.id}
                    </span>
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