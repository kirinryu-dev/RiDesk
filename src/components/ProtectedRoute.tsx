import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/OptimizedAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  moderatorOnly?: boolean;
  requiredPermission?: string;
  requiredTag?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false,
  moderatorOnly = false,
  requiredPermission,
  requiredTag
}) => {
  const { isAuthenticated, isAdmin, isModerator, hasPermission, hasTag, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  if (moderatorOnly && !isModerator()) {
    return <Navigate to="/dashboard" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" />;
  }

  if (requiredTag && !hasTag(requiredTag)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;