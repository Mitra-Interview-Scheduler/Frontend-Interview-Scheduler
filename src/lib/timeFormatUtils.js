import { format, parse } from 'date-fns';

/**
 * Converts a time string (HH:mm format) to display format based on user preference
 * @param {string} timeStr - Time string in HH:mm format (e.g., "14:30")
 * @param {string} timeFormat - 'h:mm a' for 12-hour or 'HH:mm' for 24-hour
 * @returns {string} Formatted time string
 */
export const formatTimeString = (timeStr, timeFormat) => {
  if (!timeStr) return '';
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0);
    return format(date, timeFormat);
  } catch {
    return timeStr;
  }
};

/**
 * Converts a Date object to display format based on user preference
 * @param {Date} date - Date object to format
 * @param {string} timeFormat - '12h' or '24h'
 * @returns {string} Formatted time string
 */
export const formatTime = (date, timeFormat = '24h') => {
  if (!date) return '';
  
  try {
    const formatStr = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
    return format(date, formatStr);
  } catch {
    return '';
  }
};

/**
 * Converts a Date range to display format
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} timeFormat - '12h' or '24h'
 * @returns {string} Formatted time range
 */
export const formatTimeRange = (startDate, endDate, timeFormat = '24h') => {
  if (!startDate || !endDate) return '';
  
  try {
    const start = formatTime(startDate, timeFormat);
    const end = formatTime(endDate, timeFormat);
    return `${start} – ${end}`;
  } catch {
    return '';
  }
};

/**
 * Parse time string (HH:mm) to 12h or 24h format
 * @param {string} timeStr - Time string in HH:mm format
 * @param {boolean} is12h - true for 12-hour format, false for 24-hour
 * @returns {string} Formatted time string
 */
export const convertTimeFormat = (timeStr, is12h) => {
  if (!timeStr) return '';
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0);
    const formatStr = is12h ? 'h:mm a' : 'HH:mm';
    return format(date, formatStr);
  } catch {
    return timeStr;
  }
};
