import { addMinutes, format, getDay, parse, startOfWeek } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { dateFnsLocalizer } from 'react-big-calendar';

export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

export const padDatePart = (value) => String(value).padStart(2, '0');

export const formatLocalDateTime = (date, includeSeconds = true) => {
  if (!date) return '';
  const d = new Date(date);
  const seconds = includeSeconds ? `:${padDatePart(d.getSeconds())}` : '';
  return `${d.getFullYear()}-${padDatePart(d.getMonth() + 1)}-${padDatePart(d.getDate())}` +
    `T${padDatePart(d.getHours())}:${padDatePart(d.getMinutes())}${seconds}`;
};

export const formatInputDateTime = (date) => formatLocalDateTime(date, false);

export const formatInputDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${padDatePart(d.getMonth() + 1)}-${padDatePart(d.getDate())}`;
};

export const generateTimeOptions = (startDate, endDate, stepMinutes = 30) => {
  const options = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    options.push({
      label: format(current, 'h:mm a'),
      value: format(current, 'HH:mm'),
      date: new Date(current),
    });
    current = addMinutes(current, stepMinutes);
  }

  return options;
};

export const parseTimeOnDate = (timeStr, referenceDate) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
