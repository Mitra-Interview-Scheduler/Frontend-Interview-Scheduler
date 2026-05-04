import React from 'react';
import { useTimeFormat } from '@/context/TimeFormatContext';
import { useTimeZone } from '@/context/TimeZoneContext';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Check, Globe } from 'lucide-react';

const SettingsPage = () => {
  const { timeFormat, setTimeFormat, is12h, is24h } = useTimeFormat();
  const {
    selectedTimeZone,
    detectedTimeZone,
    isUsingAutoDetected,
    availableTimeZones,
    setSelectedTimeZone,
    resetToDetectedTimeZone,
  } = useTimeZone();

  const timezoneOffset = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'shortOffset',
    timeZone: selectedTimeZone,
  })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value || 'UTC';

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
                  onClick={() => setTimeFormat('24h')}
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
                  onClick={() => setTimeFormat('12h')}
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

              <Select value={selectedTimeZone} onValueChange={setSelectedTimeZone}>
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
                <Button variant="outline" onClick={resetToDetectedTimeZone}>
                  Use Auto-detected Time Zone
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
