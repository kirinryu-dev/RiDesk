import React from 'react';
import { format } from 'date-fns';
import { Bell, Zap, Shield, Code, Users } from 'lucide-react';

interface PlatformUpdate {
  id: number;
  title: string;
  description: string;
  timestamp: Date;
  type: 'feature' | 'security' | 'maintenance' | 'community';
  priority: 'low' | 'medium' | 'high';
}

const PlatformUpdates: React.FC = () => {
  const updates: PlatformUpdate[] = [
    {
      id: 1,
      title: 'New Mission Categories',
      description: 'Added AI/ML and DevOps mission categories with specialized rewards',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      type: 'feature',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Enhanced Security',
      description: 'Implemented two-factor authentication for mission submissions',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      type: 'security',
      priority: 'high'
    },
    {
      id: 3,
      title: 'Community Milestone',
      description: '1000+ missions completed! Thank you to our amazing developers',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      type: 'community',
      priority: 'medium'
    },
    {
      id: 4,
      title: 'API Rate Limits',
      description: 'Updated API rate limits to improve platform performance',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
      type: 'maintenance',
      priority: 'low'
    }
  ];

  const getUpdateIcon = (type: PlatformUpdate['type']) => {
    switch (type) {
      case 'feature':
        return <Zap className="h-4 w-4 text-blue-600" />;
      case 'security':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'maintenance':
        return <Code className="h-4 w-4 text-orange-600" />;
      case 'community':
        return <Users className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getUpdateColor = (type: PlatformUpdate['type']) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 ring-blue-600';
      case 'security':
        return 'bg-red-100 ring-red-600';
      case 'maintenance':
        return 'bg-orange-100 ring-orange-600';
      case 'community':
        return 'bg-green-100 ring-green-600';
      default:
        return 'bg-gray-100 ring-gray-600';
    }
  };

  const getPriorityBadge = (priority: PlatformUpdate['priority']) => {
    switch (priority) {
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Medium</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Low</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {updates.map((update, updateIdx) => (
          <li key={update.id}>
            <div className="relative pb-8">
              {updateIdx !== updates.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getUpdateColor(update.type)}`}>
                    {getUpdateIcon(update.type)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{update.title}</p>
                        {getPriorityBadge(update.priority)}
                      </div>
                      <p className="text-sm text-gray-600">{update.description}</p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500 ml-4">
                      {format(update.timestamp, 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          type="button"
          className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          View All Updates
        </button>
      </div>
    </div>
  );
};

export default PlatformUpdates;