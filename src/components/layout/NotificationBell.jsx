import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, ChevronDown, Loader2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const TYPE_LABELS = {
  INTERVIEW_SCHEDULED: 'Interview',
  INTERVIEW_CANCELLED: 'Cancelled',
  INTERVIEW_REMINDER: 'Reminder',
  INTERVIEW_COORDINATOR_SCHEDULED: 'Coordination',
  INTERVIEW_COORDINATOR_ASSIGNED: 'Coordinator',
  CANDIDATE_COORDINATOR_ASSIGNED: 'Candidate',
  FEEDBACK_SUBMITTED: 'Feedback',
  STATUS_CHANGED: 'Status',
  INTERVIEW_POSTPONE_REQUESTED: 'Time Proposed',
  INTERVIEW_POSTPONE_REJECTED: 'Time Declined',
  INTERVIEW_POSTPONE_APPROVED: 'Time Accepted',
};

const formatNotificationType = (type) => {
  if (!type) return 'Update';
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const isCancelledNotification = (type) =>
  type === 'INTERVIEW_CANCELLED' || (type && type.includes('CANCELLED'));

const NotificationItem = ({
  notification,
  expanded,
  onClick,
  onMarkAsRead,
}) => {
  const cancelled = isCancelledNotification(notification.type);

  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm transition-all duration-200',
        expanded ? 'py-1' : 'py-0',
        cancelled
          ? notification.read
            ? 'border-destructive/20 bg-destructive/5 border-l-[3px] border-l-destructive/60'
            : 'border-destructive/30 bg-destructive/10 border-l-4 border-l-destructive shadow-md'
          : notification.read
            ? 'border-border/80 bg-muted/30 border-l-[3px] border-l-muted-foreground/25'
            : 'border-primary/25 bg-primary/10 border-l-4 border-l-primary shadow-md',
        expanded && (cancelled ? 'bg-destructive/15 shadow-md' : 'bg-primary/10 shadow-md')
      )}
    >
      <button
        type="button"
        className={cn(
          'w-full text-left rounded-lg px-4 transition-colors',
          expanded ? 'py-4' : 'py-3.5',
          cancelled ? 'hover:bg-destructive/10' : 'hover:bg-primary/5'
        )}
        onPointerDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className={cn('flex items-center gap-2 mb-1', expanded && 'flex-wrap')}>
              <p
                className={cn(
                  notification.read ? 'font-medium' : 'font-semibold',
                  expanded ? 'text-base whitespace-normal' : 'text-sm truncate',
                  cancelled && 'text-destructive',
                  !cancelled && !notification.read && 'text-foreground',
                  notification.read && !cancelled && 'text-foreground/85'
                )}
              >
                {notification.subject}
              </p>
              <Badge
                variant={cancelled ? 'destructive' : notification.read ? 'secondary' : 'default'}
                className="text-[10px] shrink-0"
              >
                {formatNotificationType(notification.type)}
              </Badge>
            </div>
            <div
              className={cn(
                'overflow-hidden',
                expanded ? 'h-auto' : 'h-10'
              )}
            >
              <p
                className={cn(
                  expanded ? 'text-sm leading-relaxed whitespace-normal' : 'text-xs line-clamp-2',
                  cancelled
                    ? 'text-destructive/90'
                    : notification.read
                      ? 'text-muted-foreground'
                      : 'text-foreground/75'
                )}
              >
                {notification.message}
              </p>
            </div>
          </div>
          {!notification.read && (
            <span
              className={cn(
                'mt-1 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background',
                cancelled ? 'bg-destructive' : 'bg-primary'
              )}
            />
          )}
        </div>

        {notification.createdAt && (
          <p
            className={cn(
              'mt-2',
              expanded ? 'text-xs' : 'text-[11px]',
              cancelled ? 'text-destructive/70' : 'text-muted-foreground'
            )}
          >
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        )}
      </button>

      {expanded && !notification.read && (
        <div
          className={cn(
            'mx-4 mb-3 mt-1 border-t pt-3',
            cancelled ? 'border-destructive/20' : 'border-primary/15'
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              'w-full h-9 gap-2 text-xs font-medium shadow-sm',
              cancelled
                ? 'border-destructive/35 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive'
                : 'border-primary/35 bg-background text-primary hover:bg-primary/10 hover:text-primary'
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <CheckCheck className="w-4 h-4" />
            Mark as read
          </Button>
        </div>
      )}
    </div>
  );
};

const NotificationSection = ({
  title,
  count,
  emptyLabel,
  open,
  onOpenChange,
  children,
}) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className="flex w-full items-center justify-between border-b bg-muted/25 px-5 py-2.5 text-left hover:bg-muted/40 transition-colors"
        onPointerDown={(event) => event.preventDefault()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground shrink-0">
            {title}
          </p>
          {count > 0 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {count}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground truncate">{emptyLabel}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>
    </CollapsibleTrigger>
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>
);

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  const [expandedId, setExpandedId] = useState(null);
  const [readOpen, setReadOpen] = useState(false);
  const [unreadOpen, setUnreadOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const { unread, read } = useMemo(() => ({
    unread: notifications.filter((item) => !item.read),
    read: notifications.filter((item) => item.read),
  }), [notifications]);

  useEffect(() => {
    if (unread.length === 0) {
      setUnreadOpen(false);
      if (read.length > 0) {
        setReadOpen(true);
      }
    } else {
      setUnreadOpen(true);
    }
  }, [unread.length, read.length]);

  const handleNotificationClick = (notification) => {
    setExpandedId((current) => (current === notification.id ? null : notification.id));
  };

  const handleMarkAsRead = (notificationId) => {
    markAsRead(notificationId);
    setExpandedId((current) => (current === notificationId ? null : current));
  };

  const renderList = (items, { emptyMessage }) => {
    if (items.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="px-1 py-1 space-y-2">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            expanded={expandedId === notification.id}
            onClick={() => handleNotificationClick(notification)}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    );
  };

  const handlePanelOpenChange = (open) => {
    setPanelOpen(open);
    if (open) {
      refreshNotifications();
      setUnreadOpen(unreadCount > 0);
      setReadOpen(unreadCount === 0 && read.length > 0);
    } else {
      setExpandedId(null);
      setReadOpen(false);
      setUnreadOpen(true);
    }
  };

  return (
    <>
      {panelOpen && typeof document !== 'undefined' && createPortal(
        <motion.button
          type="button"
          aria-label="Close notifications"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[2px] cursor-default border-0 p-0"
          onClick={() => handlePanelOpenChange(false)}
        />,
        document.body
      )}
    <DropdownMenu open={panelOpen} onOpenChange={handlePanelOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center bg-destructive text-white text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="z-[100] w-96 p-0 bg-card border-border shadow-xl overflow-hidden rounded-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setExpandedId(null);
                markAllAsRead();
              }}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto overflow-x-hidden pb-2">
            <NotificationSection
              title="Unread"
              count={unread.length}
              emptyLabel="All caught up"
              open={unreadOpen}
              onOpenChange={setUnreadOpen}
            >
              {renderList(unread, {
                emptyMessage: 'No unread notifications.',
              })}
            </NotificationSection>

            <NotificationSection
              title="Read"
              count={read.length}
              emptyLabel="None yet"
              open={readOpen}
              onOpenChange={setReadOpen}
            >
              {renderList(read, {
                emptyMessage: 'No read notifications.',
              })}
            </NotificationSection>

            <p className="px-5 py-2 text-[10px] text-muted-foreground border-t">
              Notifications older than 15 days are removed automatically at 12:00 daily.
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
};

export default NotificationBell;
