import { isToday, isTomorrow } from 'date-fns';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { useTimeZone } from '@/context/TimeZoneContext';

const toDate = (value) => (value instanceof Date ? value : new Date(value));

const formatDateParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date instanceof Date ? date : new Date(date));
  return parts.reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});
};

const formatDateByPattern = (date, dateFormat, timeZone) => {
  if (!date) return '';

  try {
    const { year, month, day } = formatDateParts(date, timeZone);

    switch (dateFormat) {
      case 'dd-MM-yyyy':
        return `${day}-${month}-${year}`;
      case 'MM/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'dd/MM/yyyy':
        return `${day}/${month}/${year}`;
      case 'yyyy-MM-dd':
      default:
        return `${year}-${month}-${day}`;
    }
  } catch {
    return '';
  }
};

const formatTimeByPreference = (date, timeFormat, timeZone) => {
  if (!date) return '';

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat !== '24h',
    }).format(date instanceof Date ? date : new Date(date));
  } catch {
    return '';
  }
};

/**
 * Custom hook that provides all date/time formatting functions
 * automatically using the user's preferred time and date formats
 * @returns {Object} Object with formatting functions
 */
export const useFormattedDateTime = () => {
  const { timeFormat, dateFormat } = useTimeFormat();
  const { selectedTimeZone } = useTimeZone();

  // Convert timeFormat from '12h'/'24h' to the format string needed
  const timeFormatStr = timeFormat === '24h' ? '24h' : '12h';

  return {
    /**
     * Format a single time value
     * @param {Date} date
     * @returns {string} Formatted time
     */
    formatTime: (date) => formatTimeByPreference(date, timeFormatStr, selectedTimeZone),

    /**
     * Format a time range
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {string} Formatted range like "2:30 PM – 3:30 PM"
     */
    formatTimeRange: (startDate, endDate) => {
      const start = formatTimeByPreference(startDate, timeFormatStr, selectedTimeZone);
      const end = formatTimeByPreference(endDate, timeFormatStr, selectedTimeZone);
      return start && end ? `${start} – ${end}` : '';
    },

    /**
     * Format a date
     * @param {Date|string} date
     * @returns {string} Formatted date
     */
    formatDate: (date) => formatDateByPattern(date, dateFormat, selectedTimeZone),

    /**
     * Format date and time together
     * @param {Date|string} date
     * @returns {string} Formatted date and time
     */
    formatDateTime: (date) => {
      const formattedDate = formatDateByPattern(date, dateFormat, selectedTimeZone);
      const formattedTime = formatTimeByPreference(date, timeFormatStr, selectedTimeZone);
      return formattedDate && formattedTime ? `${formattedDate} ${formattedTime}` : '';
    },

    /**
     * Format date with weekday (e.g., "Monday, May 15, 2024")
     * @param {Date|string} date
     * @returns {string} Formatted date with weekday
     */
    formatDateWithWeekday: (date) => {
      if (!date) return '';

      try {
        const weekday = new Intl.DateTimeFormat('en-US', {
          timeZone: selectedTimeZone,
          weekday: 'long',
        }).format(date instanceof Date ? date : new Date(date));
        return `${weekday}, ${formatDateByPattern(date, dateFormat, selectedTimeZone)}`;
      } catch {
        return '';
      }
    },

    /**
     * Format date and time range (e.g., "May 15, 2024 · 2:30 PM – 3:30 PM")
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {string} Formatted range
     */
    formatDateTimeRange: (startDate, endDate) => {
      const formattedDate = formatDateByPattern(startDate, dateFormat, selectedTimeZone);
      const formattedStart = formatTimeByPreference(startDate, timeFormatStr, selectedTimeZone);
      const formattedEnd = formatTimeByPreference(endDate, timeFormatStr, selectedTimeZone);
      return formattedDate && formattedStart && formattedEnd
        ? `${formattedDate} · ${formattedStart} – ${formattedEnd}`
        : '';
    },

    /**
     * Human-friendly schedule label, e.g. "Today · 6:30 AM – 7:00 AM"
     * or "Monday, Jul 20, 2026 · 6:30 AM – 7:00 AM".
     */
    formatFriendlyDateTimeRange: (startDate, endDate) => {
      if (!startDate || !endDate) return '';

      try {
        const start = toDate(startDate);
        const end = toDate(endDate);
        const timeRange = formatTimeByPreference(start, timeFormatStr, selectedTimeZone)
          && formatTimeByPreference(end, timeFormatStr, selectedTimeZone)
          ? `${formatTimeByPreference(start, timeFormatStr, selectedTimeZone)} – ${formatTimeByPreference(end, timeFormatStr, selectedTimeZone)}`
          : '';

        if (!timeRange) return '';

        let dayLabel;
        if (isToday(start)) {
          dayLabel = 'Today';
        } else if (isTomorrow(start)) {
          dayLabel = 'Tomorrow';
        } else {
          dayLabel = new Intl.DateTimeFormat('en-US', {
            timeZone: selectedTimeZone,
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(start);
        }

        return `${dayLabel} · ${timeRange}`;
      } catch {
        return '';
      }
    },

    /**
     * Duration between two times, e.g. "30 minutes" or "1 hour 15 minutes".
     */
    formatDuration: (startDate, endDate) => {
      if (!startDate || !endDate) return '';

      try {
        const start = toDate(startDate);
        const end = toDate(endDate);
        const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        if (totalMinutes === 0) return '0 minutes';

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
        if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
        return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
      } catch {
        return '';
      }
    },

    /**
     * Format date range (e.g., "May 15 – May 20")
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {string} Formatted date range
     */
    formatDateRange: (startDate, endDate) => {
      const start = formatDateByPattern(startDate, dateFormat, selectedTimeZone);
      const end = formatDateByPattern(endDate, dateFormat, selectedTimeZone);
      return start && end ? `${start} – ${end}` : '';
    },

    /**
     * Format time string (HH:mm to user's preferred format)
     * @param {string} timeStr - Time string in HH:mm format
     * @returns {string} Formatted time
     */
    formatTimeString: (timeStr) => {
      if (!timeStr) return '';

      try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(1970, 0, 1, hours, minutes, 0);
        return formatTimeByPreference(date, timeFormatStr, selectedTimeZone);
      } catch {
        return timeStr;
      }
    },

    // Export raw formats for direct use
    timeFormatStr,
    dateFormat,
    selectedTimeZone,
  };
};
