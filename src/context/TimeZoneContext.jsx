import React, { createContext, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

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
  const detectedTimeZone = getDetectedTimeZone();
  const savedTimeZone = localStorage.getItem(TIMEZONE_STORAGE_KEY);

  const [selectedTimeZone, setSelectedTimeZoneState] = useState(
    savedTimeZone || detectedTimeZone
  );

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

