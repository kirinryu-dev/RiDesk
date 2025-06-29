import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Code2,
  UserCircle,
  PlusCircle,
  CreditCard,
  Shield,
  BarChart3,
  UserCog,
  Tags,
  FileText,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/OptimizedAuthContext';

const Sidebar: React.FC = () => {
  const { logout, user, isAdmin, isModerator, hasPermission, hasTag } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Define menu items based on roles and permissions
  const getMenuItems = () => {
    const baseItems = [
      {
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        show: true
      },
      {
        to: '/missions',
        icon: Code2,
        label: 'Missions',
        show: hasPermission('view_missions') || hasPermission('create_missions')
      },
      {
        to: '/missions/new',
        icon: PlusCircle,
        label: 'Post Mission',
        show: hasPermission('create_missions')
      },
      {
        to: '/pricing',
        icon: CreditCard,
        label: 'Pricing',
        show: true
      }
    ];

    const roleBasedItems = [];

    // Admin-specific items
    if (isAdmin()) {
      roleBasedItems.push(
        {
          to: '/admin',
          icon: Shield,
          label: 'Admin Panel',
          show: true
        },
        {
          to: '/admin/users',
          icon: UserCog,
          label: 'User Management',
          show: hasPermission('manage_users')
        },
        {
          to: '/admin/analytics',
          icon: BarChart3,
          label: 'Analytics',
          show: hasPermission('view_analytics')
        }
      );
    }

    // Moderator-specific items
    if (isModerator() && !isAdmin()) {
      roleBasedItems.push(
        {
          to: '/moderator',
          icon: Shield,
          label: 'Moderator Panel',
          show: true
        },
        {
          to: '/moderator/reports',
          icon: FileText,
          label: 'Reports',
          show: hasPermission('view_reports')
        }
      );
    }

    // Tag-based items
    const tagBasedItems = [];

    if (hasTag('beta_tester')) {
      tagBasedItems.push({
        to: '/beta',
        icon: Zap,
        label: 'Beta Features',
        show: true
      });
    }

    if (hasTag('content_creator')) {
      tagBasedItems.push({
        to: '/content',
        icon: FileText,
        label: 'Content Studio',
        show: true
      });
    }

    if (hasTag('api_access')) {
      tagBasedItems.push({
        to: '/api',
        icon: Code2,
        label: 'API Console',
        show: true
      });
    }

    const profileItems = [
      {
        to: '/profile',
        icon: UserCircle,
        label: 'Profile',
        show: true
      },
      {
        to: '/settings',
        icon: Settings,
        label: 'Settings',
        show: true
      }
    ];

    return [...baseItems, ...roleBasedItems, ...tagBasedItems, ...profileItems];
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      moderator: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user?.role || 'user']}`}>
        {user?.role?.toUpperCase()}
      </span>
    );
  };

  const getExpertiseBadge = () => {
    const expertiseColors = {
      Expert: 'bg-red-100 text-red-800',
      Advanced: 'bg-purple-100 text-purple-800',
      Intermediate: 'bg-blue-100 text-blue-800',
      Rookie: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${expertiseColors[user?.expertise_level || 'Rookie']}`}>
        {user?.expertise_level}
      </span>
    );
  };

  return (
    <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">riDesk</h1>
      </div>

      <div className="flex flex-col justify-between h-full">
        <div className="px-4 py-6">
          <div className="space-y-2">
            {menuItems.filter(item => item.show).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </NavLink>
            ))}

            {/* Show user tags if any */}
            {user?.tags && user.tags.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Special Access
                </p>
                <div className="mt-2 px-4">
                  <div className="flex flex-wrap gap-1">
                    {user.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        <Tags className="w-3 h-3 mr-1" />
                        {tag.tag_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <img
              className="h-10 w-10 rounded-full mr-3"
              src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
              alt={user?.name || 'User'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <div className="flex items-center space-x-1 mt-1">
                {getRoleBadge()}
                {getExpertiseBadge()}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;