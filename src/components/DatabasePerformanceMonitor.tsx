import React, { useState } from 'react';
import { useDatabasePerformance } from '../hooks/useOptimizedQuery';
import { Database, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

const DatabasePerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { data: performanceData, isLoading, error, refetch } = useDatabasePerformance();

  if (!isVisible) {
    return (
      <button
        onClick={() => {
          setIsVisible(true);
          refetch();
        }}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Database Performance Monitor"
      >
        <Database className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          <h3 className="font-medium text-gray-900">Database Performance</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="p-4">
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Analyzing database...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-center text-red-800">
              <XCircle className="h-4 w-4 mr-2" />
              Error: {error}
            </div>
          </div>
        )}

        {performanceData && (
          <div className="space-y-4">
            {/* Foreign Key Indexes Status */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Foreign Key Indexes</h4>
              <div className="space-y-2">
                {performanceData.foreign_key_indexes?.map((fk: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {fk.table}.{fk.column}
                    </span>
                    {fk.has_index ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Indexed
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Missing
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Index Usage */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Index Usage</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {performanceData.index_usage?.slice(0, 5).map((idx: any, index: number) => (
                  <div key={index} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 truncate">{idx.index}</span>
                      <span className="text-gray-900">{idx.scans} scans</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Size: {idx.size}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Sizes */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Table Sizes</h4>
              <div className="space-y-1">
                {performanceData.table_sizes?.slice(0, 5).map((table: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{table.table}</span>
                    <span className="text-gray-900">{table.size}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Refresh Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabasePerformanceMonitor;