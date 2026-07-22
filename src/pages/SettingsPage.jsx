import React, { useState, useCallback,useEffect } from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { useTimeZone } from '@/context/TimeZoneContext';
import { useAuth } from '@/context/AuthContext';
import { userSettingsAPI, googleCalendarAPI } from '@/services/api';
import { hasInterviewerRole, getNormalizedRoles } from '@/lib/roleHelpers';
import { handleGoogleCalendarOAuthResult } from '@/lib/googleCalendarRedirect';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Check, Globe, Calendar, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';




const SettingsPage = () => {

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      
      // Convert time format to backend format
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
      console.log('Fetched user settings:', userSettingData);

      if (userSettingData) {
        const { timezone, preferredDateFormat, preferredTimeFormat, emailNotificationsEnabled: emailEnabled } = userSettingData;

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
    if (calendarStatus.connected && hasInterviewerRole(getNormalizedRoles(user))) {
      loadGoogleCalendars();
    } else {
      setGoogleCalendars([]);
      setSelectedCalendarIds([]);
    }
  }, [calendarStatus.connected, loadGoogleCalendars, user]);

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
      dashboardPath: hasInterviewerRole(getNormalizedRoles(user))
        ? '/interviewer/dashboard'
        : null,
    });
  }, [loadCalendarStatus, loadGoogleCalendars, toast, navigate, user]);

  const handleConnectGoogleCalendar = async () => {
    try {
      setCalendarActionLoading(true);
      const { authorizationUrl } = await googleCalendarAPI.connect(
        hasInterviewerRole(getNormalizedRoles(user))
          ? '/interviewer/dashboard'
          : '/settings'
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
      <div className="max-w-2xl space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your preferences</p>
        </div>

        {/* Time Format Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Setting Title */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">Time Format</h2>
                <Badge variant="outline" className="ml-auto">
                  {is24h ? '24-Hour' : '12-Hour'}
                </Badge>
              </div>

              {/* Format Options - Compact */}
              <div className="grid grid-cols-2 gap-2">
                {/* 24-Hour Option */}
                <button
                  onClick={() => handleTimeFormatChange('24h')}
                  className={`p-2.5 rounded border-2 transition-all text-sm ${
                    is24h
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-left">
                      <p className="font-semibold text-xs">24-Hour</p>
                      <p className="text-xs text-muted-foreground">09:30 - 17:45</p>
                    </div>
                    {is24h && <Check className="w-3 h-3 text-indigo-600 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                {/* 12-Hour Option */}
                <button
                  onClick={() => handleTimeFormatChange('12h')}
                  className={`p-2.5 rounded border-2 transition-all text-sm ${
                    is12h
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-left">
                      <p className="font-semibold text-xs">12-Hour</p>
                      <p className="text-xs text-muted-foreground">9:30 AM - 5:45 PM</p>
                    </div>
                    {is12h && <Check className="w-3 h-3 text-indigo-600 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Format Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">Date Format</h2>
                <Badge variant="outline" className="ml-auto">
                  {dateFormats.find((f) => f.value === dateFormat)?.label || 'Default'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {dateFormats.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => handleDateFormatChange(fmt.value)}
                    className={`p-2.5 rounded border-2 transition-all text-sm ${
                      dateFormat === fmt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-left">
                        <p className="font-semibold text-xs">{fmt.label}</p>
                        <p className="text-xs text-muted-foreground">{fmt.example}</p>
                      </div>
                      {dateFormat === fmt.value && (
                        <Check className="w-3 h-3 text-indigo-600 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Zone Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">Time Zone</h2>
                <Badge variant="outline" className="ml-auto">
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

              <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                <p className="text-sm font-medium">{selectedTimeZone}</p>
                <p className="text-xs text-muted-foreground">Offset: {timezoneOffset}</p>
                <p className="text-xs text-muted-foreground">Detected: {detectedTimeZone}</p>
              </div>

              {!isUsingAutoDetected && (
                <Button 
                  variant="outline" 
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

        {/* Email Notifications Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">Email Notifications</h2>
                <Badge variant="outline" className="ml-auto">
                  {emailNotificationsEnabled ? 'On' : 'Off'}
                </Badge>
              </div>

              <label className="flex items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  checked={emailNotificationsEnabled}
                  onCheckedChange={handleEmailNotificationsChange}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Send me email notifications
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Get an email for interview scheduling, cancellations, reminders, coordinator
                    assignments, status changes, and feedback submissions, in addition to your
                    in-app notifications.
                  </span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">Google Calendar</h2>
                <Badge variant="outline" className="ml-auto">
                  {calendarLoading ? 'Checking...' : calendarStatus.connected ? 'Connected' : 'Not connected'}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {hasInterviewerRole(getNormalizedRoles(user))
                  ? 'Google Calendar is required for interviewer availability. Choose which calendars Mitra should show on your availability view.'
                  : 'Connect your Google Calendar to sync availability and show events on the availability view.'}
              </p>

              {calendarStatus.connected && calendarStatus.googleAccountEmail && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-sm font-medium">{calendarStatus.googleAccountEmail}</p>
                  <p className="text-xs text-muted-foreground">Linked Google account</p>
                </div>
              )}

              {calendarStatus.connected && hasInterviewerRole(getNormalizedRoles(user)) && (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Calendars to show</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Events from selected calendars appear read-only on My Availability and are
                        used for scheduling conflict checks (up to 25). Leave all unchecked to hide
                        Google events and skip those calendars in conflict checks.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadGoogleCalendars}
                      disabled={calendarsLoading || calendarsSaving}
                    >
                      {calendarsLoading ? 'Refreshing…' : 'Refresh'}
                    </Button>
                  </div>

                  {calendarsLoading && googleCalendars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading calendars…</p>
                  ) : googleCalendars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No calendars found for this account.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {googleCalendars.map((cal) => {
                        const checked = selectedCalendarIds.includes(cal.id);
                        return (
                          <label
                            key={cal.id}
                            className="flex items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleCalendarSelection(cal.id, value === true)}
                              disabled={calendarsSaving}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground truncate">
                                {cal.name}
                                {cal.primary ? ' (Primary)' : ''}
                              </span>
                              <span className="block text-[11px] text-muted-foreground truncate">
                                {cal.accessRole || 'reader'}
                                {cal.googleSelected ? ' · shown in Google' : ''}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-muted-foreground">
                      {selectedCalendarIds.length} selected
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveCalendarSelection}
                      disabled={calendarsLoading || calendarsSaving}
                    >
                      {calendarsSaving ? 'Saving…' : 'Save calendar selection'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {calendarStatus.connected ? (
                   (
                    <Button
                      variant="outline"
                      onClick={handleDisconnectGoogleCalendar}
                      disabled={calendarActionLoading || calendarLoading}
                    >
                      {calendarActionLoading ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={handleConnectGoogleCalendar}
                    disabled={calendarActionLoading || calendarLoading}
                  >
                    {calendarActionLoading ? 'Redirecting...' : 'Connect Google Calendar'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Reload current settings
                window.location.reload();
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;
