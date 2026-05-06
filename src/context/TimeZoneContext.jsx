import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';

const TIMEZONE_STORAGE_KEY = 'preferredTimeZone';
const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Colombo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Tokyo',
];

const TimeZoneContext = createContext(null);

const getDetectedTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const getSupportedTimeZones = () => {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }
  return FALLBACK_TIMEZONES;
};

export const useTimeZone = () => {
  const context = useContext(TimeZoneContext);
  if (!context) {
    throw new Error('useTimeZone must be used within TimeZoneProvider');
  }
  return context;
};

export const TimeZoneProvider = ({ children }) => {
  const { user } = useAuth();
  const detectedTimeZone = getDetectedTimeZone();
  
  // Initialize from user settings or localStorage or detected
  const getInitialTimeZone = () => {
    if (user?.settings?.timezone) {
      return user.settings.timezone;
    }
    return localStorage.getItem(TIMEZONE_STORAGE_KEY) || detectedTimeZone;
  };

  const [selectedTimeZone, setSelectedTimeZoneState] = useState(
    getInitialTimeZone()
  );

  // Sync with user settings when user logs in or settings change
  useEffect(() => {
    if (user?.settings?.timezone) {
      setSelectedTimeZoneState(user.settings.timezone);
      localStorage.setItem(TIMEZONE_STORAGE_KEY, user.settings.timezone);
    }
  }, [user?.settings?.timezone]);

  const setSelectedTimeZone = (tz) => {
    setSelectedTimeZoneState(tz);
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  };

  const resetToDetectedTimeZone = () => {
    setSelectedTimeZoneState(detectedTimeZone);
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      selectedTimeZone,
      detectedTimeZone,
      isUsingAutoDetected: !localStorage.getItem(TIMEZONE_STORAGE_KEY),
      availableTimeZones: getSupportedTimeZones(),
      setSelectedTimeZone,
      resetToDetectedTimeZone,
    }),
    [selectedTimeZone, detectedTimeZone]
  );

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
    </TimeZoneContext.Provider>
  );
};

TimeZoneProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

