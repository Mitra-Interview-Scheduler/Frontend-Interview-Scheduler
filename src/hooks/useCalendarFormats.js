import { useMemo } from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { format } from 'date-fns';

export const useCalendarFormats = () => {
  const { timeFormat, dateFormat } = useTimeFormat();

  return useMemo(() => {
    const timeFormatStr = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';

    const formatTimeRange = ({ start, end }) => {
      const startStr = format(start, timeFormatStr);
      const endStr = format(end, timeFormatStr);
      return `${startStr} - ${endStr}`;
    };

    return {
      timeGutterFormat: timeFormatStr,
      eventTimeRangeFormat: formatTimeRange,
      dateFormat,
      dayFormat: `EEE ${dateFormat}`,
      weekdayFormat: 'EEE',
      monthHeaderFormat: 'MMMM yyyy',
      dayHeaderFormat: `EEEE ${dateFormat}`,
      agendaHeaderFormat: ({ start, end }) => `${format(start, dateFormat)} - ${format(end, dateFormat)}`,
      agendaDateFormat: `EEE ${dateFormat}`,
      agendaTimeFormat: timeFormatStr,
      agendaTimeRangeFormat: formatTimeRange,
      todayRangeLabel: (label) => label,
      todayLabel: 'Today',
    };
  }, [timeFormat, dateFormat]);
};
