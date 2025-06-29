import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Github, 
  Zap,
  ExternalLink,
  Star
} from 'lucide-react';

// Note: In a real application, these would come from a backend API
// This represents static resource links that would typically be admin-managed
interface Resource {
  id: number;
  name: string;
  description: string;
  type: 'documentation' | 'tool' | 'community' | 'integration';
  url: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const AvailableResources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from your backend
    const fetchResources = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // This would typically come from your backend/CMS
        const staticResources: Resource[] = [
          {
            id: 1,
            name: 'Mission Guidelines',
            description: 'Best practices for creating and completing missions',
            type: 'documentation',
            url: '#',
            icon: <BookOpen className="h-5 w-5" />,
            popular: true
          },
          {
            id: 2,
            name: 'Developer Community',
            description: 'Connect with other developers and share knowledge',
            type: 'community',
            url: '#',
            icon: <Users className="h-5 w-5" />,
            popular: true
          },
          {
            id: 3,
            name: 'GitHub Integration',
            description: 'Seamless integration with GitHub repositories',
            type: 'integration',
            url: '#',
            icon: <Github className="h-5 w-5" />
          }
        ];
        
        setResources(staticResources);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  const getResourceColor = (type: Resource['type']) => {
    switch (type) {
      case 'documentation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'tool':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'community':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'integration':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="border rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-6">
        <Code2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No resources available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Resources will be added soon
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <div
          key={resource.id}
          className={`relative rounded-lg border p-4 hover:shadow-md transition-shadow duration-200 ${getResourceColor(resource.type)}`}
        >
          {resource.popular && (
            <div className="absolute -top-2 -right-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Star className="w-3 h-3 mr-1" />
                Popular
              </span>
            </div>
          )}
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="p-2 rounded-md bg-white shadow-sm">
                {resource.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium truncate">{resource.name}</h3>
                <ExternalLink className="h-4 w-4 flex-shrink-0 ml-2 opacity-60" />
              </div>
              <p className="text-sm opacity-80 mt-1">{resource.description}</p>
              <div className="mt-3">
                <a
                  href={resource.url}
                  className="text-sm font-medium hover:underline"
                >
                  Access Resource →
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AvailableResources;