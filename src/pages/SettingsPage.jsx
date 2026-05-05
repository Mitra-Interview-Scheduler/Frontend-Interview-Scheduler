import React, { useState, useCallback } from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { useTimeZone } from '@/context/TimeZoneContext';
import { useAuth } from '@/context/AuthContext';
import { userSettingsAPI } from '@/services/api';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Check, Globe, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { timeFormat, setTimeFormat, dateFormat, setDateFormat, is12h, is24h } = useTimeFormat();
  const {
    selectedTimeZone,
    detectedTimeZone,
    isUsingAutoDetected,
    availableTimeZones,
    setSelectedTimeZone,
    resetToDetectedTimeZone,
  } = useTimeZone();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

      // Update localStorage and user in auth context
      localStorage.setItem('preferredTimeZone', selectedTimeZone);
      localStorage.setItem('timeFormat', timeFormat);
      localStorage.setItem('dateFormat', dateFormat);

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

  const dateFormats = [
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD', example: '2024-05-15' },
    { value: 'dd-MM-yyyy', label: 'DD-MM-YYYY', example: '15-05-2024' },
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY', example: '05/15/2024' },
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY', example: '15/05/2024' },
  ];

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
