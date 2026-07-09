import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import { googleCalendarAPI } from '@/services/api';
import { getNormalizedRoles, hasInterviewerRole } from '@/lib/roleHelpers';

const EXEMPT_PATHS = ['/login', '/interviewer/connect-calendar'];

export const InterviewerCalendarGuard = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = React.useState(true);
  const [connected, setConnected] = React.useState(false);

  const userRoles = getNormalizedRoles(user);
  const requiresCalendar = hasInterviewerRole(userRoles);
  const isExemptPath = EXEMPT_PATHS.some((path) => location.pathname.startsWith(path));

  React.useEffect(() => {
    let cancelled = false;

    const checkCalendarStatus = async () => {
      if (authLoading || !user || !requiresCalendar || isExemptPath) {
        if (!cancelled) {
          setConnected(true);
          setChecking(false);
        }
        return;
      }

      try {
        const status = await googleCalendarAPI.getStatus();
        if (!cancelled) {
          setConnected(Boolean(status.connected));
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          setConnected(false);
          setChecking(false);
        }
      }
    };

    setChecking(true);
    checkCalendarStatus();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, requiresCalendar, isExemptPath, location.pathname]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!requiresCalendar) {
    return children;
  }

  if (checking && !isExemptPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!connected && !isExemptPath) {
    return (
      <Navigate
        to="/interviewer/connect-calendar"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

InterviewerCalendarGuard.propTypes = {
  children: PropTypes.node.isRequired,
};
