import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PropTypes from 'prop-types';
import { getNormalizedRoles, normalizeRole } from '@/lib/roleHelpers';

const getUserRoles = (user) => getNormalizedRoles(user);

export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
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
      if (userRoles.includes('ADMIN')) {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (userRoles.includes('HR')) {
        return <Navigate to="/hr/dashboard" replace />;
      }
      if (userRoles.includes('INTERVIEWER')) {
        return <Navigate to="/interviewer/connect-calendar" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};
