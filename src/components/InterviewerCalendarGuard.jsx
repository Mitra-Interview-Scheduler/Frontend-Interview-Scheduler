import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';
import { googleCalendarAPI } from '@/services/api';
import { getNormalizedRoles, hasInterviewerRole } from '@/lib/roleHelpers';
import { FullScreenLoading } from '@/components/ui/loading';
import { getCalendarGrantMsLeft, isCalendarUsable } from '@/lib/googleCalendarRedirect';

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
  // Result of the last status check: which user it was for, which navigation it ran on, when the
  // Google grant expires, and whether an exempt page (settings, connect page…) was visited since.
  const [status, setStatus] = React.useState({
    userKey: null,
    locationKey: null,
    connected: false,
    expiresAt: Infinity,
    visitedExempt: false,
  });

  const userRoles = getNormalizedRoles(user);
  const requiresCalendar = hasInterviewerRole(userRoles);
  const isExemptPath = EXEMPT_PATHS.some((path) => location.pathname.startsWith(path));
  const userKey = user ? String(user.id ?? user.email) : null;

  const shouldCheck = !authLoading && Boolean(userKey) && requiresCalendar && !isExemptPath;
  const checkedForUser = status.userKey === userKey;
  // A connected calendar is trusted until its grant expires or the user visits an exempt page
  // (where they can disconnect or reconnect it). A disconnected one is re-checked on the next
  // navigation, so returning from the connect page picks up the new connection.
  const isStale = !checkedForUser
    || status.visitedExempt
    || (status.connected && status.expiresAt <= Date.now())
    || (!status.connected && status.locationKey !== location.key);

  React.useEffect(() => {
    if (isExemptPath && checkedForUser && !status.visitedExempt) {
      setStatus((prev) => ({ ...prev, visitedExempt: true }));
    }
  }, [isExemptPath, checkedForUser, status.visitedExempt]);

  React.useEffect(() => {
    if (!shouldCheck || !isStale) {
      return undefined;
    }

    let cancelled = false;
    const locationKey = location.key;

    googleCalendarAPI
      .getStatus()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setStatus({
            userKey,
            locationKey,
            // An expired grant counts as disconnected so the user is sent to reconnect.
            connected: isCalendarUsable(result),
            expiresAt: Date.now() + getCalendarGrantMsLeft(result),
            visitedExempt: false,
          });
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
