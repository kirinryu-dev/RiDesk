import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import OptimizedDashboard from './pages/OptimizedDashboard';
import OptimizedMissionList from './components/OptimizedMissionList';
import MissionForm from './pages/missionForm.page';
import ClaimPage from './pages/claim.page';
import AdminPanel from './pages/AdminPanel';
import UserProfile from './pages/UserProfile';
import Pricing from './pages/Pricing';
import Success from './pages/Success';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Context - Use optimized version
import { OptimizedAuthProvider } from './context/OptimizedAuthContext';

function App() {
  return (
    <OptimizedAuthProvider>
      <Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/success" element={<Success />} />
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <OptimizedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/missions"
              element={
                <ProtectedRoute>
                  <OptimizedMissionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/missions/new"
              element={
                <ProtectedRoute>
                  <MissionForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/missions/:id/claim"
              element={
                <ProtectedRoute>
                  <ClaimPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute>
                  <Pricing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </OptimizedAuthProvider>
  );
}

export default App;