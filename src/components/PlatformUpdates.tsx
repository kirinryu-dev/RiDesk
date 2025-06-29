import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Bell, Zap, Shield, Code, Users } from 'lucide-react';

// Note: In a real application, these would come from a backend API
// For now, keeping minimal static data as this would typically be admin-managed content
interface PlatformUpdate {
  id: number;
  title: string;
  description: string;
  timestamp: Date;
  type: 'feature' | 'security' | 'maintenance' | 'community';
  priority: 'low' | 'medium' | 'high';
}

const PlatformUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from your backend
    // For now, we'll simulate an API call with minimal data
    const fetchUpdates = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // This would typically come from your backend
        const mockUpdates: PlatformUpdate[] = [
          {
            id: 1,
            title: 'System Maintenance',
            description: 'Scheduled maintenance completed successfully',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            type: 'maintenance',
            priority: 'low'
          }
        ];
        
        setUpdates(mockUpdates);
      } catch (error) {
        console.error('Error fetching platform updates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
  }, []);

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

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
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

  if (updates.length === 0) {
    return (
      <div className="text-center py-6">
        <Bell className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No recent updates</h3>
        <p className="mt-1 text-sm text-gray-500">
          Check back later for platform updates
        </p>
      </div>
    );
  }

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
                      <p className="text-sm font-medium text-gray-900">{update.title}</p>
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
    </div>
  );
};

export default PlatformUpdates;