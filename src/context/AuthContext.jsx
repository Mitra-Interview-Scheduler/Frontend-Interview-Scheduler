import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  authAPI,
  ensureCsrfToken,
  getRetryAfterSeconds,
  isRateLimited,
  userSettingsAPI,
} from '@/services/api';
import { getNormalizedRoles } from '@/lib/roleHelpers';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/authSession';
import { isServerUnavailableError } from '@/lib/serverStatus';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Page-load refresh: on a 429, wait and retry instead of signing the user out.
const MAX_REFRESH_RETRIES = 2;
const MAX_RETRY_WAIT_SECONDS = 15;
const wait = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const refreshWithRateLimitRetry = async () => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await authAPI.refresh();
    } catch (error) {
      if (!isRateLimited(error) || attempt >= MAX_REFRESH_RETRIES) throw error;
      await wait(Math.min(getRetryAfterSeconds(error) ?? 5, MAX_RETRY_WAIT_SECONDS));
    }
  }
};

const getErrorMessage = (error, fallback) => {
  if (isRateLimited(error)) {
    const seconds = getRetryAfterSeconds(error);
    return seconds
      ? `Too many attempts. Please wait ${seconds} seconds and try again.`
      : 'Too many attempts. Please wait a moment and try again.';
  }
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
  // True when the session could not be restored because the server is unreachable
  const [serverUnavailable, setServerUnavailable] = useState(false);

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
    clearAccessToken();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('preferredTimeZone');
    localStorage.removeItem('dateFormat');
    localStorage.removeItem('timeFormat');
  };

  const restoreSession = async () => {
    setLoading(true);
    setServerUnavailable(false);
    try {
      await ensureCsrfToken();
      const response = await refreshWithRateLimitRetry();
      setAccessToken(response.token);
      syncUser(buildUserFromResponse(response));
      await loadUserSettings();
    } catch (error) {
      clearSession();
      // Server down (not a missing/expired session): show the "server unavailable" page
      setServerUnavailable(isServerUnavailableError(error));
    }
    setLoading(false);
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      setAccessToken(response.token);
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
      setAccessToken(response.token);
      await loadUserSettings();
      return syncUser(buildUserFromResponse(response));
    } catch (error) {
      console.error('Google login error:', error);
      clearSession();
      throw new Error(getErrorMessage(error, 'Google login failed'));
    }
  };

  const logout = async () => {
    await authAPI.logout();
    clearSession();
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    syncUser,
    logout,
    loading,
    serverUnavailable,
    retrySession: restoreSession,
    isAuthenticated: !!user && !!getAccessToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
