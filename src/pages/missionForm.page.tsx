import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Tags, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

const missionSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  repository: z.string().url('Must be a valid URL'),
  level: z.enum(['Rookie', 'Intermediate', 'Advanced', 'Expert']),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  estimated_hours: z.number().min(1).max(40),
  reward: z.number().min(10),
});

const MissionForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    repository: '',
    level: 'Intermediate',
    tags: [] as string[],
    estimated_hours: 4,
    reward: 100,
  });
  const [tagInput, setTagInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = missionSchema.parse(formData);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ...validatedData,
          created_by: user?.id,
          status: 'available'
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Mission created successfully!');
      navigate('/missions');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error creating mission:', error);
        toast.error('Failed to create mission. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Mission</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Brief mission title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Detailed mission description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Repository URL</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <GitBranch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={formData.repository}
              onChange={e => setFormData(prev => ({ ...prev, repository: e.target.value }))}
              className="block w-full pl-10 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="https://github.com/username/repo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Level</label>
          <select
            value={formData.level}
            onChange={e => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="Rookie">Rookie</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tags</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <div className="relative flex-grow focus-within:z-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Tags className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="block w-full rounded-none rounded-l-md pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add technologies"
              />
            </div>
            <button
              type="button"
              onClick={addTag}
              className="relative -ml-px inline-flex items-center rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1.5 inline-flex items-center justify-center text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                min="1"
                max="40"
                value={formData.estimated_hours}
                onChange={e => setFormData(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) }))}
                className="block w-full pl-10 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reward ($)</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                min="10"
                value={formData.reward}
                onChange={e => setFormData(prev => ({ ...prev, reward: parseInt(e.target.value) }))}
                className="block w-full pl-10 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/missions')}
            className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Mission'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MissionForm;