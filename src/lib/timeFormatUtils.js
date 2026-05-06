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

/**
 * Converts a Date object to display format based on user's date preference
 * @param {Date} date - Date object to format
 * @param {string} dateFormat - Date format string (yyyy-MM-dd, dd-MM-yyyy, etc.)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, dateFormat = 'yyyy-MM-dd') => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, dateFormat);
  } catch {
    return '';
  }
};

/**
 * Converts a Date with both date and time based on user preferences
 * @param {Date} date - Date object to format
 * @param {string} dateFormat - Date format string (yyyy-MM-dd, dd-MM-yyyy, etc.)
 * @param {string} timeFormat - '12h' or '24h'
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, dateFormat = 'yyyy-MM-dd', timeFormat = '24h') => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const formattedDate = format(dateObj, dateFormat);
    const timeStr = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
    const formattedTime = format(dateObj, timeStr);
    return `${formattedDate} ${formattedTime}`;
  } catch {
    return '';
  }
};

/**
 * Formats date with weekday (e.g., "Monday, May 15, 2024" or based on dateFormat)
 * @param {Date|string} date - Date to format
 * @param {string} dateFormat - Date format without weekday
 * @returns {string} Formatted date with weekday
 */
export const formatDateWithWeekday = (date, dateFormat = 'MMMM dd, yyyy') => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, `EEEE, ${dateFormat}`);
  } catch {
    return '';
  }
};

/**
 * Formats date and time range (e.g., "May 15, 2024 · 2:30 PM – 3:30 PM")
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} dateFormat - Date format
 * @param {string} timeFormat - '12h' or '24h'
 * @returns {string} Formatted range
 */
export const formatDateTimeRange = (startDate, endDate, dateFormat = 'MMM d, yyyy', timeFormat = '24h') => {
  if (!startDate || !endDate) return '';
  
  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const timeStr = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
    const formattedDate = format(start, dateFormat);
    const formattedStart = format(start, timeStr);
    const formattedEnd = format(end, timeStr);
    return `${formattedDate} · ${formattedStart} – ${formattedEnd}`;
  } catch {
    return '';
  }
};

/**
 * Formats just the date range (e.g., "May 15 – May 20" or "May 15 – 20")
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} dateFormat - Date format (without month/year if same)
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate, dateFormat = 'MMM dd') => {
  if (!startDate || !endDate) return '';
  
  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const startFormatted = format(start, dateFormat);
    const endFormatted = format(end, dateFormat);
    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return '';
  }
};
