import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};




export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to extract primary role from roles array
  const getPrimaryRole = (roles) => {
    if (Array.isArray(roles) && roles.length > 0) {
      return roles[0];
    }
    return 'INTERVIEWER'; // default fallback
  };

  const getAutoDetectedTimeZone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  };

  const syncUser = (userData) => {
     const nextUser = {
    id: userData.id,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
  };

    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser({
    ...userData,
    settings: userData.settings || {
      timezone: getAutoDetectedTimeZone(),
      preferredDateFormat: 'yyyy-MM-dd',
      preferredTimeFormat: 'HH:mm',
    },
  });

  return nextUser;

  };

  useEffect(() => {
    // Check if user is logged in
  const initAuth = async () => {
  const token = localStorage.getItem('token');

  if (token) {
    try {
      const response = await authAPI.verify(); // get fresh user data

      syncUser(response); // rehydrate full user in memory
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  }

  setLoading(false);
};

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      const autoDetectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const userData = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role || (Array.isArray(response.roles) ? response.roles[0] : 'INTERVIEWER'),
        roles: response.roles,
        profilePicture: response.profilePictureUrl || response.profilePicture || null,
        profilePictureUrl: response.profilePictureUrl || response.profilePicture || null,
        settings: response.settings || {
          timezone: autoDetectedTz,
          preferredDateFormat: 'yyyy-MM-dd',
          preferredTimeFormat: 'HH:mm',
        },
      };
      
      localStorage.setItem('token', response.token);
      // Store timezone for API interceptor
      if (userData.settings?.timezone) {
        localStorage.setItem('preferredTimeZone', userData.settings.timezone);
      }
      syncUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);

      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);

      const autoDetectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const userData = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role || (Array.isArray(response.roles) ? response.roles[0] : 'INTERVIEWER'),
        roles: response.roles,
        profilePicture: response.profilePictureUrl || response.profilePicture || null,
        profilePictureUrl: response.profilePictureUrl || response.profilePicture || null,
        settings: response.settings || {
          timezone: autoDetectedTz,
          preferredDateFormat: 'yyyy-MM-dd',
          preferredTimeFormat: 'HH:mm',
        },
      };

      localStorage.setItem('token', response.token);
      // Store timezone for API interceptor
      if (userData.settings?.timezone) {
        localStorage.setItem('preferredTimeZone', userData.settings.timezone);
      }
      syncUser(userData);

      return userData;
    } catch (error) {
      console.error('Google login error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);

      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    syncUser,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};