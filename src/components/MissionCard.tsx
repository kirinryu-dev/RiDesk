import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Tags } from 'lucide-react';

interface MissionCardProps {
  mission: {
    id: string;
    title: string;
    description: string;
    level: string;
    tags: string[];
    estimated_hours: number;
    reward: number;
    status: string;
  };
}

const MissionCard: React.FC<MissionCardProps> = ({ mission }) => {
  const navigate = useNavigate();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'bg-red-100 text-red-800';
      case 'Advanced': return 'bg-purple-100 text-purple-800';
      case 'Intermediate': return 'bg-blue-100 text-blue-800';
      case 'Rookie': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
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
  );
}

export default MissionCard;