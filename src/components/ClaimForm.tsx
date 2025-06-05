import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ClaimFormProps {
  missionId: string;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ missionId }) => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [pullRequestUrl, setPullRequestUrl] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullRequestUrl) {
      toast.error('Please enter a pull request URL');
      return;
    }

    setIsClaiming(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_mission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mission_id: missionId,
          pr_url: pullRequestUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to claim mission');
      }

      toast.success('Mission claimed successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Error claiming mission:', error);
      toast.error('Failed to claim mission');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Pull Request URL</label>
        <input
          type="url"
          value={pullRequestUrl}
          onChange={(e) => setPullRequestUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="https://github.com/org/repo/pull/123"
          required
        />
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
  );
};

export default ClaimForm;