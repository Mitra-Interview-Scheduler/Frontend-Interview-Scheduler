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
