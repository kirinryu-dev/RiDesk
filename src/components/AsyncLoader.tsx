import React from 'react';

interface AsyncLoaderProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
}

const AsyncLoader: React.FC<AsyncLoaderProps> = ({ loading, error, children }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AsyncLoader;