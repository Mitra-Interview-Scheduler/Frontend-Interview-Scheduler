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
  const [timeFormat, setTimeFormatState] = useState('24h');
  const [dateFormat, setDateFormatState] = useState('yyyy-MM-dd');

  // Initialize from user settings when user logs in or settings change
  useEffect(() => {
    if (user?.settings) {
      // Determine time format from backend format
      const isTimeFormat24h = 
        user.settings.preferredTimeFormat === 'HH:mm' ||
        !user.settings.preferredTimeFormat?.includes('a');
      
      setTimeFormatState(isTimeFormat24h ? '24h' : '12h');
      setDateFormatState(user.settings.preferredDateFormat || 'yyyy-MM-dd');
      
      // Persist to localStorage
      localStorage.setItem('timeFormat', isTimeFormat24h ? '24h' : '12h');
      localStorage.setItem('dateFormat', user.settings.preferredDateFormat || 'yyyy-MM-dd');
    } else {
      // Load from localStorage if no user or user has no settings
      const savedFormat = localStorage.getItem('timeFormat');
      if (savedFormat && (savedFormat === '12h' || savedFormat === '24h')) {
        setTimeFormatState(savedFormat);
      }
      const savedDateFormat = localStorage.getItem('dateFormat');
      if (savedDateFormat) {
        setDateFormatState(savedDateFormat);
      }
    }
  }, [user?.settings?.preferredTimeFormat, user?.settings?.preferredDateFormat]);

  // Convert time format to display format
  const getTimeFormatString = () => {
    return timeFormat === '12h' ? 'hh:mm a' : 'HH:mm';
  };

  // Save to localStorage whenever it changes
  const updateTimeFormat = (format) => {
    if (format === '12h' || format === '24h') {
      setTimeFormatState(format);
      localStorage.setItem('timeFormat', format);
    }
  };

  const updateDateFormat = (format) => {
    setDateFormatState(format);
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
