import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Clock, DollarSign, Search, Filter, ChevronDown, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Mission {
  id: string;
  title: string;
  description: string;
  repository: string;
  level: string;
  tags: string[];
  estimated_hours: number;
  reward: number;
  status: 'available' | 'claimed' | 'completed';
  created_by: string; // Changed to just store the UUID
}

const MissionList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = React.useState<Mission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<string | null>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?select=*`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch missions');
        
        const data = await response.json();
        setMissions(data);
      } catch (error) {
        console.error('Error fetching missions:', error);
        toast.error('Failed to load missions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissions();
  }, []);

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = 
      mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = selectedLevel ? mission.level === selectedLevel : true;
    return matchesSearch && matchesLevel && mission.status === 'available';
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'bg-red-100 text-red-800';
      case 'Advanced': return 'bg-purple-100 text-purple-800';
      case 'Intermediate': return 'bg-blue-100 text-blue-800';
      case 'Rookie': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Missions</h1>
          <p className="mt-1 text-gray-600">Find and claim development missions</p>
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
                  placeholder="Search missions or technologies"
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
                        onClick={() => {
                          setSelectedLevel(level);
                          setFilterOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedLevel(null);
                        setFilterOpen(false);
                      }}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMissions.map((mission) => (
          <div
            key={mission.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
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

              <h3 className="text-lg font-medium text-gray-900 mb-2">{mission.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{mission.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {mission.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Tags className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-1" />
                  <span className="font-semibold text-gray-900">${mission.reward}</span>
                </div>
                <button
                  onClick={() => navigate(`/missions/${mission.id}/claim`)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMissions.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No missions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default MissionList;