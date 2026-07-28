import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { authAPI, userSettingsAPI } from '@/services/api';
import { getNormalizedRoles } from '@/lib/roleHelpers';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  return fallback;
};

const buildUserFromResponse = (response) => {
  const roles = getNormalizedRoles({
    roles: response.roles,
    role: response.role,
  });

  return {
    id: response.id,
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    role: roles[0] || 'INTERVIEWER',
    roles,
    profilePicture: response.profilePictureUrl || response.profilePicture || null,
    profilePictureUrl: response.profilePictureUrl || response.profilePicture || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getPrimaryRole = (roles) => {
    const normalizedRoles = getNormalizedRoles(roles);
    return normalizedRoles[0] || 'INTERVIEWER';
  };

  const syncUser = (userData) => {
    const roles = getNormalizedRoles(userData);
    const nextUser = {
      ...userData,
      profilePicture: userData.profilePicture || userData.profilePictureUrl || null,
      profilePictureUrl: userData.profilePictureUrl || userData.profilePicture || null,
      roles,
      role: roles[0] || getPrimaryRole(userData.roles),
    };

    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const loadUserSettings = async () => {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    try {
      const settings = await userSettingsAPI.getSettings();
      localStorage.setItem('preferredTimeZone', settings.timezone || detectedTimeZone);
      localStorage.setItem('dateFormat', settings.preferredDateFormat || 'yyyy-MM-dd');
      localStorage.setItem('timeFormat', settings.preferredTimeFormat === 'HH:mm' ? '24h' : '12h');
    } catch (settingsError) {
      console.warn('Could not fetch settings:', settingsError);
      localStorage.setItem('preferredTimeZone', detectedTimeZone);
      localStorage.setItem('dateFormat', 'yyyy-MM-dd');
      localStorage.setItem('timeFormat', '12h');
    }
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('preferredTimeZone');
    localStorage.removeItem('dateFormat');
    localStorage.removeItem('timeFormat');
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          await authAPI.verify();
          const parsedUser = JSON.parse(storedUser);
          syncUser(parsedUser);
        } catch (error) {
          clearSession();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.token);
      await loadUserSettings();
      return syncUser(buildUserFromResponse(response));
    } catch (error) {
      console.error('Login error:', error);
      clearSession();
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      localStorage.setItem('token', response.token);
      await loadUserSettings();
      return syncUser(buildUserFromResponse(response));
    } catch (error) {
      console.error('Google login error:', error);
      clearSession();
      throw new Error(getErrorMessage(error, 'Google login failed'));
    }
  };

  const logout = () => {
    clearSession();
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
