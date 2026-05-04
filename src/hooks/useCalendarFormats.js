import { useMemo } from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { format } from 'date-fns';

export const useCalendarFormats = () => {
  const { timeFormat } = useTimeFormat();

  return useMemo(() => {
    const timeFormatStr = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';

    return {
      timeGutterFormat: timeFormatStr,
      eventTimeRangeFormat: ({ start, end }) => {
        const startStr = format(start, timeFormatStr);
        const endStr = format(end, timeFormatStr);
        return `${startStr} – ${endStr}`;
      },
      dateFormat: 'MMM dd',
      dayFormat: 'EEE MMM dd',
      weekdayFormat: 'EEE',
      monthHeaderFormat: 'MMMM yyyy',
      dayHeaderFormat: 'EEEE MMM dd',
      agendaHeaderFormat: ({ start, end }) => {
        return `${format(start, 'MMM dd')} – ${format(end, 'MMM dd')}`;
      },
      agendaDateFormat: 'EEE MMM dd',
      agendaTimeFormat: timeFormatStr,
      agendaTimeRangeFormat: ({ start, end }) => {
        const startStr = format(start, timeFormatStr);
        const endStr = format(end, timeFormatStr);
        return `${startStr} – ${endStr}`;
      },
      todayRangeLabel: (label) => label,
      todayLabel: 'Today',
    };
  }, [timeFormat]);
};
