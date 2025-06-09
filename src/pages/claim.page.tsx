import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GitBranch, Clock, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Mission {
  id: string;
  title: string;
  description: string;
  repository: string;
  level: string;
  tags: string[];
  estimatedHours: number;
  reward: number;
  status: 'available' | 'claimed' | 'completed';
  createdBy: {
    name: string;
    avatar: string;
  };
}

const ClaimPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = React.useState<Mission | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [pullRequestUrl, setPullRequestUrl] = React.useState('');

  React.useEffect(() => {
    const fetchMission = async () => {
      try {
        const response = await fetch(`/api/missions/${id}`);
        if (!response.ok) throw new Error('Mission not found');
        const data = await response.json();
        setMission(data);
      } catch (error) {
        toast.error('Failed to load mission');
        navigate('/missions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMission();
  }, [id, navigate]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullRequestUrl) {
      toast.error('Please enter a pull request URL');
      return;
    }

    setIsClaiming(true);
    try {
      const response = await fetch(`/api/missions/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullRequestUrl }),
      });

      if (!response.ok) throw new Error('Failed to claim mission');

      toast.success('Mission claimed successfully!');
      navigate('/profile');
    } catch (error) {
      toast.error('Failed to claim mission');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Mission not found</h2>
        <p className="mt-2 text-gray-600">This mission might have been removed or doesn't exist.</p>
        <button
          onClick={() => navigate('/missions')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Missions
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{mission.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              mission.level === 'Expert' ? 'bg-red-100 text-red-800' :
              mission.level === 'Advanced' ? 'bg-purple-100 text-purple-800' :
              mission.level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {mission.level}
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Description</h2>
              <p className="mt-2 text-gray-600">{mission.description}</p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{mission.estimatedHours} hours</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">${mission.reward}</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900">Repository</h2>
              <a
                href={mission.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <GitBranch className="h-5 w-5 mr-2" />
                View Repository
              </a>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900">Required Skills</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {mission.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <form onSubmit={handleClaim}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700">Pull Request URL</label>
                  <div className="mt-1">
                    <input
                      type="url"
                      value={pullRequestUrl}
                      onChange={(e) => setPullRequestUrl(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="https://github.com/org/repo/pull/123"
                      required
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Submit your pull request URL to claim this mission
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/missions')}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Mission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimPage;