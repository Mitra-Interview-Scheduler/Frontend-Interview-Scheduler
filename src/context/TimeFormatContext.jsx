import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TimeFormatContext = createContext(null);

export const useTimeFormat = () => {
  const context = useContext(TimeFormatContext);
  if (!context) {
    throw new Error('useTimeFormat must be used within TimeFormatProvider');
  }
  return context;
};

export const TimeFormatProvider = ({ children }) => {
  const [timeFormat, setTimeFormat] = useState('24h');

  // Load preference from localStorage on mount
  useEffect(() => {
    const savedFormat = localStorage.getItem('timeFormat');
    if (savedFormat && (savedFormat === '12h' || savedFormat === '24h')) {
      setTimeFormat(savedFormat);
    }
  }, []);

  // Save to localStorage whenever it changes
  const updateTimeFormat = (format) => {
    if (format === '12h' || format === '24h') {
      setTimeFormat(format);
      localStorage.setItem('timeFormat', format);
    }
  };

  const value = {
    timeFormat,
    setTimeFormat: updateTimeFormat,
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
