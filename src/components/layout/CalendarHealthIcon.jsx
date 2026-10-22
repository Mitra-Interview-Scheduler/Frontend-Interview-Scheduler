import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { googleCalendarAPI } from '@/services/api';
import { hasInterviewerRole, getNormalizedRoles } from '@/lib/roleHelpers';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { toast } from '@/hooks/use-toast';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Navbar icon for interviewers when the Google Calendar OAuth grant
 * expires within 2 days (Testing-mode refresh tokens last 7 days from consent).
 */
const CalendarHealthIcon = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { formatDateTime } = useFormattedDateTime();
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const isInterviewer = hasInterviewerRole(getNormalizedRoles(user));

  const loadStatus = useCallback(async () => {
    if (!isInterviewer) {
      setStatus(null);
      return;
    }
    try {
      const data = await googleCalendarAPI.getStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, [isInterviewer]);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadStatus]);

  // After OAuth reconnect redirect (?googleCalendar=connected), refresh expiry immediately.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('googleCalendar') === 'connected') {
      loadStatus();
    }
  }, [location.search, loadStatus]);

  const handleReconnect = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      setReconnecting(true);
      const returnTo = location.pathname?.startsWith('/')
        ? location.pathname
        : '/interviewer/dashboard';
      const { authorizationUrl } = await googleCalendarAPI.connect(returnTo);
      if (!authorizationUrl) {
        throw new Error('No authorization URL returned');
      }
      window.location.href = authorizationUrl;
    } catch (error) {
      setReconnecting(false);
      toast({
        title: 'Unable to reconnect calendar',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  if (!isInterviewer || !status?.connected || !status?.tokenExpiresAt) {
    return null;
  }

  const expiresAt = new Date(status.tokenExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  const msUntilExpiry = expiresAt.getTime() - Date.now();
  // Show only when grant expiry is within 2 days (or already expired).
  if (msUntilExpiry > TWO_DAYS_MS) {
    return null;
  }

  const daysLeft = Math.max(0, Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000)));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0"
          title="Calendar authorization expiring soon"
          aria-label="Google Calendar authorization expiring"
        >
          <CalendarClock className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="z-[100] w-80 p-0 bg-card border-border shadow-xl overflow-hidden rounded-xl"
      >
        <div className="border-b px-5 py-3.5">
          <p className="font-semibold text-sm">Google Calendar authorization expiring</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {msUntilExpiry <= 0
              ? 'Expired'
              : daysLeft <= 1
                ? 'Expires within a day'
                : `About ${daysLeft} days left`}
            {status.tokenExpiresAt ? ` · ${formatDateTime(status.tokenExpiresAt)}` : ''}
          </p>
          {status.googleAccountEmail ? (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Account: {status.googleAccountEmail}
            </p>
          ) : null}
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reconnect to renew your Google grant and keep availability sync and Meet links working.
          </p>
          <Button
            className="w-full gap-2"
            disabled={reconnecting}
            onClick={handleReconnect}
          >
            <RefreshCw className={`w-4 h-4 ${reconnecting ? 'animate-spin' : ''}`} />
            {reconnecting ? 'Redirecting…' : 'Reconnect Calendar'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CalendarHealthIcon;
