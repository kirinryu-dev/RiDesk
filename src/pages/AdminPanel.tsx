import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  PlusCircle,
  Trash2,
  Edit,
  UserPlus,
  Download,
  BarChart,
  Shield,
  Tags,
  Search
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  department: string;
  expertise_level: string;
  created_at: string;
  tags: Array<{
    tag_name: string;
    tag_value: string | null;
  }>;
}

const AdminPanel: React.FC = () => {
  const { accessToken, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', value: '' });

  useEffect(() => {
    if (!isAdmin()) {
      return;
    }
    fetchData();
  }, [accessToken, isAdmin]);

  const fetchData = async () => {
    if (!accessToken) return;

    try {
      // Fetch missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('id, title, description, level, status, reward, created_at')
        .order('created_at', { ascending: false });

      if (missionsError) {
        console.error('Error fetching missions:', missionsError);
      } else {
        setMissions(missionsData || []);
      }

      // Fetch users with their profiles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id, name, email, role, department, expertise_level, created_at,
          user_tags (tag_name, tag_value)
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else {
        const formattedUsers = usersData?.map(user => ({
          ...user,
          tags: user.user_tags || []
        })) || [];
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'moderator' | 'user') => {
    try {
      const { error } = await supabase
        .rpc('update_user_role', {
          target_user_id: userId,
          new_role: newRole
        });

      if (error) {
        throw error;
      }

      toast.success('User role updated successfully');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleAssignTag = async () => {
    if (!selectedUser || !newTag.name) {
      toast.error('Please fill in the tag name');
      return;
    }

    try {
      const { error } = await supabase
        .rpc('assign_user_tag', {
          target_user_id: selectedUser.id,
          tag_name: newTag.name,
          tag_value: newTag.value || null
        });

      if (error) {
        throw error;
      }

      toast.success('Tag assigned successfully');
      setShowTagModal(false);
      setNewTag({ name: '', value: '' });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error assigning tag:', error);
      toast.error(error.message || 'Failed to assign tag');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need admin privileges to access this page
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-gray-600">Manage users, missions, and system settings</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
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
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
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
          {activeTab === 'users' && (
            <UserManagement 
              users={filteredUsers} 
              isLoading={isLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onRoleChange={handleRoleChange}
              onAssignTag={(user) => {
                setSelectedUser(user);
                setShowTagModal(true);
              }}
            />
          )}
          {activeTab === 'missions' && (
            <MissionManagement missions={missions} isLoading={isLoading} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsView missions={missions} users={users} />
          )}
        </div>
      </div>

      {/* Tag Assignment Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Tag to {selectedUser?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tag Name</label>
                  <select
                    value={newTag.name}
                    onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select a tag</option>
                    <option value="beta_tester">Beta Tester</option>
                    <option value="content_creator">Content Creator</option>
                    <option value="api_access">API Access</option>
                    <option value="premium_support">Premium Support</option>
                    <option value="early_access">Early Access</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tag Value (Optional)</label>
                  <input
                    type="text"
                    value={newTag.value}
                    onChange={(e) => setNewTag(prev => ({ ...prev, value: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Additional tag information"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Assign Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface UserManagementProps {
  users: UserProfile[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRoleChange: (userId: string, newRole: 'admin' | 'moderator' | 'user') => void;
  onAssignTag: (user: UserProfile) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  isLoading, 
  searchTerm, 
  setSearchTerm, 
  onRoleChange,
  onAssignTag 
}) => {
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
        <h2 className="text-lg font-medium text-gray-900">User Management</h2>
        <div className="flex space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search users..."
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria' : 'Users will appear here once they register'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expertise
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={`https://ui-avatars.com/api/?name=${user.name}&background=random`}
                          alt={user.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => onRoleChange(user.id, e.target.value as 'admin' | 'moderator' | 'user')}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border-0 ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'moderator' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.expertise_level === 'Expert' ? 'bg-red-100 text-red-800' :
                      user.expertise_level === 'Advanced' ? 'bg-purple-100 text-purple-800' :
                      user.expertise_level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.expertise_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                        >
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onAssignTag(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Tags className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="h-5 w-5" />
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
  users: UserProfile[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ missions, users }) => {
  const totalMissions = missions.length;
  const availableMissions = missions.filter(m => m.status === 'available').length;
  const claimedMissions = missions.filter(m => m.status === 'claimed').length;
  const totalRewards = missions.reduce((sum, m) => sum + m.reward, 0);

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const moderatorUsers = users.filter(u => u.role === 'moderator').length;
  const regularUsers = users.filter(u => u.role === 'user').length;

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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalUsers}</dd>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Roles Distribution</h3>
          <div className="space-y-4">
            {[
              { role: 'Admin', count: adminUsers, color: 'bg-red-500' },
              { role: 'Moderator', count: moderatorUsers, color: 'bg-purple-500' },
              { role: 'User', count: regularUsers, color: 'bg-blue-500' }
            ].map(({ role, count, color }) => {
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              
              return (
                <div key={role}>
                  <div className="flex justify-between text-sm font-medium text-gray-900">
                    <span>{role}</span>
                    <span>{count} users</span>
                  </div>
                  <div className="mt-1 relative">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${color}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};

export default AdminPanel;