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
import { Clock, Check, Globe, Calendar } from 'lucide-react';
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
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, googleAccountEmail: null });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);

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

  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Convert time format to backend format
      const preferredTimeFormat = timeFormat === '24h' ? 'HH:mm' : 'hh:mm a';
      
      await userSettingsAPI.updateSettings(
        selectedTimeZone,
        dateFormat,
        preferredTimeFormat
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
  }, [selectedTimeZone, dateFormat, timeFormat, toast]);

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
        const { timezone, preferredDateFormat, preferredTimeFormat } = userSettingData;

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
    } catch (error) {
      console.error('Failed to load Google Calendar status', error);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  useEffect(() => {
    handleGoogleCalendarOAuthResult({
      navigate,
      toast,
      onConnected: loadCalendarStatus,
      dashboardPath: hasInterviewerRole(getNormalizedRoles(user))
        ? '/interviewer/dashboard'
        : null,
    });
  }, [loadCalendarStatus, toast, navigate, user]);

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
      setCalendarStatus({ connected: false, googleAccountEmail: null });
      toast({
        title: 'Google Calendar disconnected',
        description: 'Calendar sync has been turned off for your account.',
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
                  ? 'Google Calendar is required for interviewer accounts. Connect your calendar to sync availability slots and interview bookings with Google Meet links.'
                  : 'Connect your Google Calendar to sync availability slots and interview bookings with Google Meet links.'}
              </p>

              {calendarStatus.connected && calendarStatus.googleAccountEmail && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-sm font-medium">{calendarStatus.googleAccountEmail}</p>
                  <p className="text-xs text-muted-foreground">Linked Google account</p>
                </div>
              )}

              <div className="flex gap-2">
                {calendarStatus.connected ? (
                  !hasInterviewerRole(getNormalizedRoles(user)) && (
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
