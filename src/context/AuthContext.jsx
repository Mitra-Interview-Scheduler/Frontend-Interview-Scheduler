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

  const syncUser = (userData) => {
    const nextUser = {
      ...userData,
      profilePicture: userData.profilePicture || userData.profilePictureUrl || null,
      profilePictureUrl: userData.profilePictureUrl || userData.profilePicture || null,
    };

    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  useEffect(() => {
    // Check if user is logged in
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          await authAPI.verify();
          setUser(JSON.parse(storedUser));
        } catch (error) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      const userData = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role,
        profilePicture: response.profilePictureUrl || response.profilePicture || null,
        profilePictureUrl: response.profilePictureUrl || response.profilePicture || null,
      };
      
      localStorage.setItem('token', response.token);
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

      const userData = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role,
        profilePicture: response.profilePictureUrl || response.profilePicture || null,
        profilePictureUrl: response.profilePictureUrl || response.profilePicture || null,
      };

      localStorage.setItem('token', response.token);
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