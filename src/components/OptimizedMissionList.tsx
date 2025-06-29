import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Tags, Search, Filter, ChevronDown } from 'lucide-react';
import { useMissions } from '../hooks/useOptimizedQuery';
import { useAuth } from '../context/OptimizedAuthContext';

interface Mission {
  id: string;
  title: string;
  description: string;
  level: string;
  tags: string[];
  estimated_hours: number;
  reward: number;
  status: string;
  created_at: string;
}

const OptimizedMissionList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Debounced search to reduce API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use optimized query with filters
  const { data: missions = [], isLoading, error, refetch } = useMissions({
    level: selectedLevel || undefined,
    search: debouncedSearch || undefined
  });

  // Memoized filtered missions for client-side filtering
  const filteredMissions = useMemo(() => {
    if (!missions) return [];
    
    return missions.filter((mission: Mission) => {
      const matchesSearch = !searchTerm || 
        mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mission.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLevel = !selectedLevel || mission.level === selectedLevel;
      
      return matchesSearch && matchesLevel;
    });
  }, [missions, searchTerm, selectedLevel]);

  const getLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'Expert': return 'bg-red-100 text-red-800';
      case 'Advanced': return 'bg-purple-100 text-purple-800';
      case 'Intermediate': return 'bg-blue-100 text-blue-800';
      case 'Rookie': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleLevelFilter = useCallback((level: string) => {
    setSelectedLevel(level === selectedLevel ? '' : level);
    setFilterOpen(false);
  }, [selectedLevel]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Failed to load missions</div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Missions</h1>
          <p className="mt-1 text-gray-600">
            {filteredMissions.length} missions available
          </p>
        </div>
        {user && (
          <button
            onClick={() => navigate('/missions/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Post Mission
          </button>
        )}
      </div>

      {/* Optimized Search and Filter */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search missions or technologies..."
                />
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="w-full md:w-40 flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-5 w-5 text-gray-400 mr-2" />
                {selectedLevel || 'All Levels'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {['Rookie', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleLevelFilter(level)}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedLevel === level ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      onClick={() => handleLevelFilter('')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      All Levels
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mission Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMissions.map((mission: Mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              getLevelColor={getLevelColor}
              onViewDetails={() => navigate(`/missions/${mission.id}/claim`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMissions.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No missions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedLevel 
              ? 'Try adjusting your search or filter criteria'
              : 'No missions are currently available'
            }
          </p>
        </div>
      )}
    </div>
  );
};

// Memoized Mission Card Component
const MissionCard = React.memo<{
  mission: Mission;
  getLevelColor: (level: string) => string;
  onViewDetails: () => void;
}>(({ mission, getLevelColor, onViewDetails }) => (
  <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(mission.level)}`}>
          {mission.level}
        </span>
        <div className="flex items-center text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          <span className="text-sm">{mission.estimated_hours}h</span>
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">{mission.title}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{mission.description}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {mission.tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            <Tags className="w-3 h-3 mr-1" />
            {tag}
          </span>
        ))}
        {mission.tags.length > 3 && (
          <span className="text-xs text-gray-500">+{mission.tags.length - 3} more</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-gray-400 mr-1" />
          <span className="font-semibold text-gray-900">${mission.reward}</span>
        </div>
        <button
          onClick={onViewDetails}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  </div>
));

export default OptimizedMissionList;