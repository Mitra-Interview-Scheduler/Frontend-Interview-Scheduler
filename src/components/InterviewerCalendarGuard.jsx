import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import { googleCalendarAPI } from '@/services/api';
import { getNormalizedRoles, hasInterviewerRole } from '@/lib/roleHelpers';
import { FullScreenLoading } from '@/components/ui/loading';

const EXEMPT_PATHS = [
  '/login',
  '/interviewer/connect-calendar',
  '/settings',
  '/profile',
  '/interviewer/profile',
];

export const InterviewerCalendarGuard = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  // Result of the last status check: which user it was for and which navigation it ran on.
  const [status, setStatus] = React.useState({ userKey: null, locationKey: null, connected: false });

  const userRoles = getNormalizedRoles(user);
  const requiresCalendar = hasInterviewerRole(userRoles);
  const isExemptPath = EXEMPT_PATHS.some((path) => location.pathname.startsWith(path));
  const userKey = user ? String(user.id ?? user.email) : null;

  const shouldCheck = !authLoading && Boolean(userKey) && requiresCalendar && !isExemptPath;
  const checkedForUser = status.userKey === userKey;
  // A connected calendar is trusted for the rest of the session. A disconnected one is
  // re-checked on the next navigation, so returning from the connect page picks it up.
  const isStale = !checkedForUser || (!status.connected && status.locationKey !== location.key);

  React.useEffect(() => {
    if (!shouldCheck || !isStale) {
      return undefined;
    }

    let cancelled = false;
    const locationKey = location.key;

    googleCalendarAPI
      .getStatus()
      .then((result) => Boolean(result?.connected))
      .catch(() => false)
      .then((connected) => {
        if (!cancelled) {
          setStatus({ userKey, locationKey, connected });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldCheck, isStale, userKey, location.key]);

  if (authLoading) {
    return <FullScreenLoading />;
  }

  if (!requiresCalendar || isExemptPath || !userKey) {
    return children;
  }

  // Only the very first check for a user blocks rendering; later checks run behind the page.
  if (!checkedForUser) {
    return <FullScreenLoading />;
  }

  if (!status.connected && !isStale) {
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
