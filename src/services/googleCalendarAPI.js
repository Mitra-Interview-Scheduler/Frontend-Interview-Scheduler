const CALENDAR_TOKEN_KEY = 'google_calendar_access_token';

export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function storeCalendarAccessToken(token) {
  sessionStorage.setItem(CALENDAR_TOKEN_KEY, token);
}

export function getStoredCalendarAccessToken() {
  return sessionStorage.getItem(CALENDAR_TOKEN_KEY);
}

export function clearCalendarAccessToken() {
  sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
}

function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function buildMockEventPayload() {
  const start = new Date(Date.now() + 10 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const timeZone = getUserTimeZone();

  return {
    summary: 'Mock Interview Event',
    description: 'Test event created from Mitra HR Availability Calendar.',
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  };
}

export async function createGoogleCalendarEvent(accessToken, event = buildMockEventPayload()) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Google Calendar API error (${response.status})`;
    if (response.status === 401) {
      clearCalendarAccessToken();
    }
    throw new Error(message);
  }

  return response.json();
}

export async function createMockCalendarEvent(accessToken) {
  return createGoogleCalendarEvent(accessToken, buildMockEventPayload());
}
