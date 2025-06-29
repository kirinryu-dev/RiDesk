import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  PlusCircle,
  Trash2,
  Edit,
  UserPlus,
  Download,
  BarChart
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Mission {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  reward: number;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      if (!accessToken) return;

      try {
        const { data, error } = await supabase
          .from('missions')
          .select('id, title, description, level, status, reward, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching missions:', error);
          return;
        }

        setMissions(data || []);
      } catch (error) {
        console.error('Error fetching missions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissions();
  }, [accessToken]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-gray-600">Manage missions and system settings</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('missions')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'missions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-5 h-5 inline-block mr-2" />
              Missions
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart className="w-5 h-5 inline-block mr-2" />
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'missions' ? (
            <MissionManagement missions={missions} isLoading={isLoading} />
          ) : (
            <AnalyticsView missions={missions} />
          )}
        </div>
      </div>
    </div>
  );
};

interface MissionManagementProps {
  missions: Mission[];
  isLoading: boolean;
}

const MissionManagement: React.FC<MissionManagementProps> = ({ missions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4 p-4 border rounded">
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Mission Management</h2>
        <div className="flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {missions.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No missions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Missions will appear here once they are created
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reward
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {missions.map((mission) => (
                <tr key={mission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mission.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{mission.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      mission.level === 'Expert' ? 'bg-red-100 text-red-800' :
                      mission.level === 'Advanced' ? 'bg-purple-100 text-purple-800' :
                      mission.level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {mission.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      mission.status === 'available' ? 'bg-green-100 text-green-800' :
                      mission.status === 'claimed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {mission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${mission.reward}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(mission.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface AnalyticsViewProps {
  missions: Mission[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ missions }) => {
  const totalMissions = missions.length;
  const availableMissions = missions.filter(m => m.status === 'available').length;
  const claimedMissions = missions.filter(m => m.status === 'claimed').length;
  const totalRewards = missions.reduce((sum, m) => sum + m.reward, 0);

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Analytics Overview</h2>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Missions</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalMissions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-lg font-medium text-gray-900">{availableMissions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Claimed</dt>
                  <dd className="text-lg font-medium text-gray-900">{claimedMissions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Rewards</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalRewards}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Mission Distribution by Level</h3>
        <div className="space-y-4">
          {['Rookie', 'Intermediate', 'Advanced', 'Expert'].map(level => {
            const count = missions.filter(m => m.level === level).length;
            const percentage = totalMissions > 0 ? (count / totalMissions) * 100 : 0;
            
            return (
              <div key={level}>
                <div className="flex justify-between text-sm font-medium text-gray-900">
                  <span>{level}</span>
                  <span>{count} missions</span>
                </div>
                <div className="mt-1 relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        level === 'Expert' ? 'bg-red-500' :
                        level === 'Advanced' ? 'bg-purple-500' :
                        level === 'Intermediate' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;