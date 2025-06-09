import React, { useState } from 'react';
import { 
  Search,
  Filter,
  ChevronDown,
  Code2,
  GitPullRequest,
  Tags,
  Star,
  Clock
} from 'lucide-react';

// Mock data for developer missions
const missions = [
  {
    id: 1,
    title: 'Implement OAuth Authentication',
    repository: 'https://github.com/org/project/issues/123',
    level: 'Expert',
    tags: ['TypeScript', 'React', 'OAuth'],
    estimatedHours: 8,
    reward: '$200',
    status: 'available',
    description: 'Implement OAuth2.0 authentication flow with multiple providers',
  },
  {
    id: 2,
    title: 'Fix Mobile Responsive Layout',
    repository: 'https://github.com/org/project/issues/124',
    level: 'Intermediate',
    tags: ['CSS', 'React', 'Mobile'],
    estimatedHours: 4,
    reward: '$100',
    status: 'available',
    description: 'Address responsive design issues on mobile devices',
  },
  {
    id: 3,
    title: 'Setup CI/CD Pipeline',
    repository: 'https://github.com/org/project/issues/125',
    level: 'Advanced',
    tags: ['DevOps', 'GitHub Actions', 'Docker'],
    estimatedHours: 6,
    reward: '$150',
    status: 'reserved',
    description: 'Create and configure CI/CD pipeline using GitHub Actions',
  },
  {
    id: 4,
    title: 'Add Unit Tests',
    repository: 'https://github.com/org/project/issues/126',
    level: 'Rookie',
    tags: ['Jest', 'Testing', 'JavaScript'],
    estimatedHours: 3,
    reward: '$50',
    status: 'available',
    description: 'Increase test coverage for core components',
  },
];

const Resources: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter missions based on search term and selected level
  const filteredMissions = missions.filter((mission) => {
    const matchesSearch = 
      mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = selectedLevel ? mission.level === selectedLevel : true;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert':
        return 'bg-red-100 text-red-800';
      case 'Advanced':
        return 'bg-purple-100 text-purple-800';
      case 'Intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'Rookie':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Missions</h1>
        <p className="mt-1 text-gray-600">Browse and accept development missions</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="p-5">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-2/3 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by title or technology tags"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full md:w-1/3 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <button
                type="button"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-500 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <div className="flex justify-between items-center">
                  <span>{selectedLevel || 'Filter by level'}</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>
              
              {filterOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1">
                  {['Expert', 'Advanced', 'Intermediate', 'Rookie'].map((level) => (
                    <button
                      key={level}
                      className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      onClick={() => {
                        setSelectedLevel(level);
                        setFilterOpen(false);
                      }}
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    onClick={() => {
                      setSelectedLevel(null);
                      setFilterOpen(false);
                    }}
                  >
                    All Levels
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filteredMissions.map((mission) => (
          <div
            key={mission.id}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(mission.level)}`}>
                  {mission.level}
                </span>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{mission.estimatedHours}h</span>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">{mission.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{mission.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {mission.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Tags className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <GitPullRequest className="h-5 w-5 text-gray-400" />
                  <a
                    href={mission.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Issue
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-900">{mission.reward}</span>
                  <button
                    disabled={mission.status !== 'available'}
                    className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${
                      mission.status === 'available'
                        ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                  >
                    {mission.status === 'available' ? 'Accept Mission' : 'Reserved'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMissions.length === 0 && (
        <div className="mt-10 text-center">
          <Code2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No missions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default Resources;