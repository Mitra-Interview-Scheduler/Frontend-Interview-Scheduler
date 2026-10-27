import { useAuth } from '@/context/AuthContext';
import { getDefaultDashboardPath } from '@/lib/roleHelpers';

/** Where "home" is for the current user: their dashboard, or the login page when signed out. */
export const useHomePath = () => {
  const { user } = useAuth();
  return user ? getDefaultDashboardPath(user) : '/login';
};
