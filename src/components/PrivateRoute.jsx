import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PropTypes from 'prop-types';
import { getNormalizedRoles, normalizeRole } from '@/lib/roleHelpers';
import { FullScreenLoading } from '@/components/ui/loading';
import { getAccessToken } from '@/lib/authSession';
import AccessDenied from '@/pages/AccessDenied';

const getUserRoles = (user) => getNormalizedRoles(user);

export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const token = getAccessToken();

  if (loading) {
    return <FullScreenLoading />;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has ANY of the allowed roles
  if (allowedRoles.length > 0) {
    const userRoles = getUserRoles(user);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
    const hasAccess = normalizedAllowedRoles.some((role) => userRoles.includes(role));
    if (!hasAccess) {
      // Signed in but not allowed here: explain instead of silently redirecting.
      return userRoles.length > 0 ? <AccessDenied /> : <Navigate to="/login" replace />;
    }
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};
