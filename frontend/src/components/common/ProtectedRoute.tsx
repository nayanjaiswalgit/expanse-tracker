import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../layout';

export const ProtectedRoute = () => {
  const { state: authState } = useAuth();
  const location = useLocation();

  if (authState.isLoading) {
    return <LoadingSpinner />;
  }

  if (!authState.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (authState.user && authState.user.profile && !authState.user.profile.is_onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
