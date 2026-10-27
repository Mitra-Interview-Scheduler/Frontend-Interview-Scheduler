export const handleGoogleCalendarOAuthResult = ({
  navigate,
  toast,
  onConnected,
  dashboardPath = '/interviewer/dashboard',
}) => {
  const params = new URLSearchParams(window.location.search);
  const calendarResult = params.get('googleCalendar');
  if (!calendarResult) {
    return false;
  }

    if (calendarResult === 'connected') {
    toast?.({
      title: 'Google Calendar connected',
      description: 'Your calendar is now linked for availability and interview sync.',
    });
    onConnected?.();
    params.delete('googleCalendar');
    params.delete('message');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState({}, '', nextUrl);

    if (dashboardPath && window.location.pathname !== dashboardPath) {
      navigate(dashboardPath, { replace: true });
    }
    return true;
  }

  if (calendarResult === 'error') {
    toast?.({
      title: 'Google Calendar connection failed',
      description: params.get('message') || 'Authorization was not completed.',
      variant: 'destructive',
    });
    params.delete('googleCalendar');
    params.delete('message');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
    return true;
  }

  return false;
};

/**
 * Milliseconds until the Google OAuth grant in a status response expires
 * (Infinity when the backend did not send an expiry).
 */
export const getCalendarGrantMsLeft = (status) => {
  if (!status?.grantExpiresAt) return Infinity;
  const expiresAt = new Date(status.grantExpiresAt).getTime();
  return Number.isNaN(expiresAt) ? Infinity : expiresAt - Date.now();
};

/**
 * True when the calendar is linked and its grant has not expired yet. The status
 * endpoint keeps reporting `connected` after the grant expires, so check both.
 */
export const isCalendarUsable = (status) =>
  Boolean(status?.connected) && getCalendarGrantMsLeft(status) > 0;
