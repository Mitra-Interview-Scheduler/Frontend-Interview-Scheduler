import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { useTimeZone } from '@/context/TimeZoneContext';
import { useAuth } from '@/context/AuthContext';
import { userSettingsAPI, googleCalendarAPI } from '@/services/api';
import { hasInterviewerRole, getNormalizedRoles } from '@/lib/roleHelpers';
import { handleGoogleCalendarOAuthResult } from '@/lib/googleCalendarRedirect';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Check, Globe, Calendar, Mail, RefreshCw, Link2, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InlineLoading } from '@/components/ui/loading';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

const FormatOption = ({ selected, onClick, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'rounded-lg border p-3 text-left transition-colors',
      selected
        ? 'border-primary bg-primary/5'
        : 'border-border hover:border-foreground/20 hover:bg-muted/40'
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
    </div>
  </button>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const userRoles = useMemo(() => getNormalizedRoles(user), [user]);
  const isInterviewer = hasInterviewerRole(userRoles);

  const dateFormats = [
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD', example: '2024-05-15' },
    { value: 'dd-MM-yyyy', label: 'DD-MM-YYYY', example: '15-05-2024' },
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY', example: '05/15/2024' },
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY', example: '15/05/2024' },
  ];

  const { timeFormat, setTimeFormat, dateFormat, setDateFormat, is12h, is24h } = useTimeFormat();
  const {
    selectedTimeZone,
    detectedTimeZone,
    isUsingAutoDetected,
    availableTimeZones,
    setSelectedTimeZone,
    resetToDetectedTimeZone,
  } = useTimeZone();

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, googleAccountEmail: null });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [calendarsSaving, setCalendarsSaving] = useState(false);

  const handleTimeFormatChange = (format) => {
    setTimeFormat(format);
    setHasChanges(true);
  };

  const handleDateFormatChange = (format) => {
    setDateFormat(format);
    setHasChanges(true);
  };

  const handleTimeZoneChange = (tz) => {
    setSelectedTimeZone(tz);
    setHasChanges(true);
  };

  const handleEmailNotificationsChange = (checked) => {
    setEmailNotificationsEnabled(checked === true);
    setHasChanges(true);
  };

  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true);

      const preferredTimeFormat = timeFormat === '24h' ? 'HH:mm' : 'hh:mm a';

      await userSettingsAPI.updateSettings(
        selectedTimeZone,
        dateFormat,
        preferredTimeFormat,
        emailNotificationsEnabled
      );

      setHasChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedTimeZone, dateFormat, timeFormat, emailNotificationsEnabled, toast]);

  const timezoneOffset = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'shortOffset',
    timeZone: selectedTimeZone,
  })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value || 'UTC';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userSettingData = await userSettingsAPI.getSettings();

        if (userSettingData) {
          const {
            timezone,
            preferredDateFormat,
            preferredTimeFormat,
            emailNotificationsEnabled: emailEnabled,
          } = userSettingData;

          if (typeof emailEnabled === 'boolean') {
            setEmailNotificationsEnabled(emailEnabled);
          }

          if (timezone) {
            setSelectedTimeZone(timezone);
            localStorage.setItem('preferredTimeZone', timezone);
          }

          if (preferredDateFormat) {
            setDateFormat(preferredDateFormat);
            localStorage.setItem('dateFormat', preferredDateFormat);
          }

          if (preferredTimeFormat) {
            const isTimeFormat24h =
              preferredTimeFormat === 'HH:mm' || !preferredTimeFormat.includes('a');
            const format = isTimeFormat24h ? '24h' : '12h';
            setTimeFormat(format);
            localStorage.setItem('timeFormat', format);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user settings', error);
      }
    };

    fetchSettings();
  }, []);

  const loadCalendarStatus = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const status = await googleCalendarAPI.getStatus();
      setCalendarStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to load Google Calendar status', error);
      return null;
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadGoogleCalendars = useCallback(async () => {
    try {
      setCalendarsLoading(true);
      const calendars = await googleCalendarAPI.listCalendars();
      const list = Array.isArray(calendars) ? calendars : [];
      setGoogleCalendars(list);
      setSelectedCalendarIds(list.filter((c) => c.selected).map((c) => c.id));
    } catch (error) {
      console.error('Failed to load Google calendars', error);
      setGoogleCalendars([]);
      setSelectedCalendarIds([]);
      const apiMsg = error.response?.data?.message || error.message || '';
      const reconnectHint = 'Disconnect and reconnect Google Calendar in Settings, then click Refresh.';
      toast({
        title: 'Google Calendar connection issue',
        description: apiMsg
          ? (apiMsg.toLowerCase().includes('disconnect') || apiMsg.toLowerCase().includes('reconnect'))
            ? apiMsg
            : `${apiMsg} ${reconnectHint}`
          : reconnectHint,
        variant: 'destructive',
      });
    } finally {
      setCalendarsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  useEffect(() => {
    if (calendarStatus.connected && isInterviewer) {
      loadGoogleCalendars();
    } else {
      setGoogleCalendars([]);
      setSelectedCalendarIds([]);
    }
  }, [calendarStatus.connected, loadGoogleCalendars, isInterviewer]);

  useEffect(() => {
    handleGoogleCalendarOAuthResult({
      navigate,
      toast,
      onConnected: async () => {
        const status = await loadCalendarStatus();
        if (status?.connected) {
          await loadGoogleCalendars();
        }
      },
      dashboardPath: isInterviewer ? '/interviewer/dashboard' : null,
    });
  }, [loadCalendarStatus, loadGoogleCalendars, toast, navigate, isInterviewer]);

  const handleConnectGoogleCalendar = async () => {
    try {
      setCalendarActionLoading(true);
      const { authorizationUrl } = await googleCalendarAPI.connect(
        isInterviewer ? '/interviewer/dashboard' : '/settings'
      );
      window.location.href = authorizationUrl;
    } catch (error) {
      toast({
        title: 'Unable to start Google Calendar connection',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
      setCalendarActionLoading(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      setCalendarActionLoading(true);
      await googleCalendarAPI.disconnect();
      const status = await googleCalendarAPI.getStatus();
      setCalendarStatus(status);
      setGoogleCalendars([]);
      setSelectedCalendarIds([]);
      toast({
        title: 'Google Calendar disconnected',
        description: status.required
          ? 'You can reconnect below or from the connect calendar page to use interviewer availability again.'
          : 'Calendar sync has been turned off for your account.',
      });
    } catch (error) {
      toast({
        title: 'Failed to disconnect Google Calendar',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    } finally {
      setCalendarActionLoading(false);
    }
  };

  const toggleCalendarSelection = (calendarId, checked) => {
    setSelectedCalendarIds((prev) => {
      if (checked) {
        return prev.includes(calendarId) ? prev : [...prev, calendarId];
      }
      return prev.filter((id) => id !== calendarId);
    });
  };

  const handleSaveCalendarSelection = async () => {
    try {
      setCalendarsSaving(true);
      const result = await googleCalendarAPI.saveCalendarSelection(selectedCalendarIds);
      setSelectedCalendarIds(result?.calendarIds || selectedCalendarIds);
      toast({
        title: 'Calendar selection saved',
        description: (result?.calendarIds?.length ?? selectedCalendarIds.length) === 0
          ? 'No Google calendars will show on My Availability.'
          : 'Availability will load events from the calendars you selected.',
      });
      await loadGoogleCalendars();
    } catch (error) {
      toast({
        title: 'Failed to save calendar selection',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    } finally {
      setCalendarsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="w-full space-y-6 pb-8">
        <PageHeader
          title="Settings"
          description="Configure time, notifications, and calendar preferences."
          actions={
            hasChanges ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => window.location.reload()} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={saveSettings} loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            ) : null
          }
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Preferences column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Time, date, and timezone used across schedules and calendars.
                {hasChanges ? ' Click Save Changes to apply.' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Time Format</h3>
                  <Badge variant="outline">{is24h ? '24-Hour' : '12-Hour'}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FormatOption
                    selected={is24h}
                    onClick={() => handleTimeFormatChange('24h')}
                    title="24-Hour"
                    subtitle="09:30 – 17:45"
                  />
                  <FormatOption
                    selected={is12h}
                    onClick={() => handleTimeFormatChange('12h')}
                    title="12-Hour"
                    subtitle="9:30 AM – 5:45 PM"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Date Format</h3>
                  <Badge variant="outline">
                    {dateFormats.find((f) => f.value === dateFormat)?.label || 'Default'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {dateFormats.map((fmt) => (
                    <FormatOption
                      key={fmt.value}
                      selected={dateFormat === fmt.value}
                      onClick={() => handleDateFormatChange(fmt.value)}
                      title={fmt.label}
                      subtitle={fmt.example}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4" />
                    Time Zone
                  </h3>
                  <Badge variant="outline">
                    {isUsingAutoDetected ? 'Auto-detected' : 'Custom'}
                  </Badge>
                </div>

                <Select value={selectedTimeZone} onValueChange={handleTimeZoneChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableTimeZones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <p className="mt-0.5 break-all text-sm font-medium">{selectedTimeZone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Offset</p>
                    <p className="mt-0.5 text-sm font-medium">{timezoneOffset}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Detected</p>
                    <p className="mt-0.5 break-all text-sm font-medium">{detectedTimeZone}</p>
                  </div>
                </div>

                {!isUsingAutoDetected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetToDetectedTimeZone();
                      setHasChanges(true);
                    }}
                  >
                    Use Auto-detected Time Zone
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications + Calendar column */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Choose whether Mitra also sends email for scheduling activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={emailNotificationsEnabled}
                      onCheckedChange={handleEmailNotificationsChange}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          Send me email notifications
                        </span>
                        <Badge variant="outline">
                          {emailNotificationsEnabled ? 'On' : 'Off'}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        Emails for interview scheduling, cancellations, reminders, coordinator
                        assignments, status changes, and feedback submissions — in addition to
                        in-app notifications. Remember to Save Changes after toggling.
                      </span>
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      Google Calendar
                    </CardTitle>
                    <CardDescription>
                      {isInterviewer
                        ? 'Required for interviewer availability. Choose which calendars Mitra should use.'
                        : 'Connect Google Calendar to sync availability and show events.'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      calendarLoading
                        ? ''
                        : calendarStatus.connected
                          ? 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : ''
                    )}
                  >
                    {calendarLoading
                      ? 'Checking…'
                      : calendarStatus.connected
                        ? 'Connected'
                        : 'Not connected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {calendarStatus.connected && calendarStatus.googleAccountEmail && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3">
                    <p className="text-sm font-medium">{calendarStatus.googleAccountEmail}</p>
                    <p className="text-xs text-muted-foreground">Linked Google account</p>
                  </div>
                )}

                {calendarStatus.connected && isInterviewer && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">Calendars to show</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Selected calendars appear read-only on My Availability and are used for
                          conflict checks (up to 25). Leave all unchecked to hide Google events.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadGoogleCalendars}
                        disabled={calendarsLoading || calendarsSaving}
                        loading={calendarsLoading}
                        className="shrink-0 gap-2"
                      >
                        {!calendarsLoading && <RefreshCw className="h-3.5 w-3.5" />}
                        Refresh
                      </Button>
                    </div>

                    {calendarsLoading && googleCalendars.length === 0 ? (
                      <InlineLoading label="Loading calendars…" />
                    ) : googleCalendars.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No calendars found for this account.
                      </p>
                    ) : (
                      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {googleCalendars.map((cal) => {
                          const checked = selectedCalendarIds.includes(cal.id);
                          return (
                            <label
                              key={cal.id}
                              className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleCalendarSelection(cal.id, value === true)
                                }
                                disabled={calendarsSaving}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {cal.name}
                                  {cal.primary ? ' (Primary)' : ''}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {cal.accessRole || 'reader'}
                                  {cal.googleSelected ? ' · shown in Google' : ''}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        {selectedCalendarIds.length} selected
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveCalendarSelection}
                        disabled={calendarsLoading}
                        loading={calendarsSaving}
                      >
                        Save calendar selection
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {calendarStatus.connected ? (
                    <Button
                      variant="outline"
                      onClick={handleDisconnectGoogleCalendar}
                      disabled={calendarLoading}
                      loading={calendarActionLoading}
                      className="gap-2"
                    >
                      {!calendarActionLoading && <Unlink className="h-4 w-4" />}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConnectGoogleCalendar}
                      disabled={calendarLoading}
                      loading={calendarActionLoading}
                      className="gap-2"
                    >
                      {!calendarActionLoading && <Link2 className="h-4 w-4" />}
                      Connect Google Calendar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {hasChanges && (
          <div className="sticky bottom-4 z-20">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-md">
              <div className="min-w-0 pl-1">
                <p className="text-sm font-medium">Unsaved changes</p>
                <p className="text-xs text-muted-foreground">
                  Save to apply time, date, timezone, and email preferences.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={saveSettings} loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;
