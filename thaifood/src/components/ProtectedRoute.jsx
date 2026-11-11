import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LoadingState, ErrorState } from './StateView';

export default function ProtectedRoute({ children }) {
  const { member, loading, sessionError, retrySession } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState />;
  if (sessionError) return <ErrorState error={sessionError} onRetry={retrySession} />;
  if (!member) return <Navigate to="/login" replace state={{ from: location }} />;
  return children || <Outlet />;
}
