import { useTimeFormat } from '@/context/TimeFormatContext';
import {
  formatTime,
  formatTimeRange,
  formatDate,
  formatDateTime,
  formatDateWithWeekday,
  formatDateTimeRange,
  formatDateRange,
  formatTimeString,
} from '@/lib/timeFormatUtils';

/**
 * Custom hook that provides all date/time formatting functions
 * automatically using the user's preferred time and date formats
 * @returns {Object} Object with formatting functions
 */
export const useFormattedDateTime = () => {
  const { timeFormat, dateFormat } = useTimeFormat();

  // Convert timeFormat from '12h'/'24h' to the format string needed
  const timeFormatStr = timeFormat === '24h' ? '24h' : '12h';

  return {
    /**
     * Format a single time value
     * @param {Date} date
     * @returns {string} Formatted time
     */
    formatTime: (date) => formatTime(date, timeFormatStr),

    /**
     * Format a time range
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {string} Formatted range like "2:30 PM – 3:30 PM"
     */
    formatTimeRange: (startDate, endDate) => formatTimeRange(startDate, endDate, timeFormatStr),

    /**
     * Format a date
     * @param {Date|string} date
     * @returns {string} Formatted date
     */
    formatDate: (date) => formatDate(date, dateFormat),

    /**
     * Format date and time together
     * @param {Date|string} date
     * @returns {string} Formatted date and time
     */
    formatDateTime: (date) => formatDateTime(date, dateFormat, timeFormatStr),

    /**
     * Format date with weekday (e.g., "Monday, May 15, 2024")
     * @param {Date|string} date
     * @returns {string} Formatted date with weekday
     */
    formatDateWithWeekday: (date) => formatDateWithWeekday(date, dateFormat),

    /**
     * Format date and time range (e.g., "May 15, 2024 · 2:30 PM – 3:30 PM")
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {string} Formatted range
     */
    formatDateTimeRange: (startDate, endDate) =>
      formatDateTimeRange(startDate, endDate, dateFormat, timeFormatStr),

    /**
     * Format date range (e.g., "May 15 – May 20")
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {string} Formatted date range
     */
    formatDateRange: (startDate, endDate) => formatDateRange(startDate, endDate, dateFormat),

    /**
     * Format time string (HH:mm to user's preferred format)
     * @param {string} timeStr - Time string in HH:mm format
     * @returns {string} Formatted time
     */
    formatTimeString: (timeStr) => formatTimeString(timeStr, timeFormatStr === '24h' ? 'HH:mm' : 'h:mm a'),

    // Export raw formats for direct use
    timeFormatStr,
    dateFormat,
  };
};
