import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';

const TimeFormatContext = createContext(null);

export const useTimeFormat = () => {
  const context = useContext(TimeFormatContext);
  if (!context) {
    throw new Error('useTimeFormat must be used within TimeFormatProvider');
  }
  return context;
};

export const TimeFormatProvider = ({ children }) => {
  const { user } = useAuth();
  const [timeFormat, setTimeFormat] = useState('HH:mm');
  const [dateFormat, setDateFormat] = useState('yyyy-MM-dd');

  // Initialize from user settings when user logs in
  useEffect(() => {
    if (user?.settings) {
      const format = user.settings.preferredTimeFormat === 'HH:mm' ? '24h' : '12h';
      setTimeFormat(format);
      setDateFormat(user.settings.preferredDateFormat);
      localStorage.setItem('timeFormat', format);
      localStorage.setItem('dateFormat', user.settings.preferredDateFormat);
    } else {
      // Load from localStorage if no user settings
      const savedFormat = localStorage.getItem('timeFormat');
      if (savedFormat && (savedFormat === '12h' || savedFormat === '24h')) {
        setTimeFormat(savedFormat);
      }
      const savedDateFormat = localStorage.getItem('dateFormat');
      if (savedDateFormat) {
        setDateFormat(savedDateFormat);
      }
    }
  }, [user?.settings]);

  // Convert time format to display format
  const getTimeFormatString = () => {
    return timeFormat === '12h' ? 'hh:mm a' : 'HH:mm';
  };

  // Save to localStorage whenever it changes
  const updateTimeFormat = (format) => {
    if (format === '12h' || format === '24h') {
      setTimeFormat(format);
      localStorage.setItem('timeFormat', format);
    }
  };

  const updateDateFormat = (format) => {
    setDateFormat(format);
    localStorage.setItem('dateFormat', format);
  };

  const value = {
    timeFormat,
    dateFormat,
    timeFormatString: getTimeFormatString(),
    setTimeFormat: updateTimeFormat,
    setDateFormat: updateDateFormat,
    is12h: timeFormat === '12h',
    is24h: timeFormat === '24h',
  };

  return (
    <TimeFormatContext.Provider value={value}>
      {children}
    </TimeFormatContext.Provider>
  );
};

TimeFormatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
