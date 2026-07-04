import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
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
};

const isCancelledNotification = (type) =>
  type === 'INTERVIEW_CANCELLED' || (type && type.includes('CANCELLED'));

const READ_BEFORE_MARK_MS = 4000;
const READ_BEFORE_MARK_SEC = READ_BEFORE_MARK_MS / 1000;
const EXIT_ANIMATION_MS = 420;

const EXIT_EASE = [0.4, 0, 0.2, 1];

const ReadCountdown = ({ pendingRead, cancelled }) => {
  const [secondsLeft, setSecondsLeft] = useState(READ_BEFORE_MARK_SEC);

  useEffect(() => {
    if (!pendingRead) {
      setSecondsLeft(READ_BEFORE_MARK_SEC);
      return undefined;
    }

    setSecondsLeft(READ_BEFORE_MARK_SEC);
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [pendingRead]);

  if (!pendingRead) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="mt-3 flex items-center gap-2"
    >
      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', cancelled ? 'bg-destructive' : 'bg-primary')}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: READ_BEFORE_MARK_SEC, ease: 'linear' }}
        />
      </div>
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums',
          cancelled
            ? 'border-destructive/40 text-destructive bg-destructive/5'
            : 'border-primary/40 text-primary bg-primary/5'
        )}
        aria-label={`${secondsLeft} seconds remaining`}
      >
        {secondsLeft}
      </span>
    </motion.div>
  );
};

const NotificationItem = ({
  notification,
  expanded,
  pendingRead = false,
  isExiting = false,
  onClick,
}) => {
  const cancelled = isCancelledNotification(notification.type);

  return (
    <motion.button
      type="button"
      layout
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        'w-full text-left rounded-lg border px-4 shadow-sm transition-all duration-200',
        expanded ? 'py-4' : 'py-3.5',
        cancelled
          ? notification.read
            ? 'border-destructive/20 bg-destructive/5 border-l-[3px] border-l-destructive/60 hover:bg-destructive/10'
            : 'border-destructive/30 bg-destructive/10 border-l-4 border-l-destructive hover:bg-destructive/15 shadow-md'
          : notification.read
            ? 'border-border/80 bg-muted/30 border-l-[3px] border-l-muted-foreground/25 hover:bg-muted/45'
            : 'border-primary/25 bg-primary/10 border-l-4 border-l-primary hover:bg-primary/15 shadow-md',
        expanded && (cancelled ? 'bg-destructive/15 shadow-md' : 'bg-primary/10 shadow-md'),
        pendingRead && (cancelled
          ? 'ring-2 ring-destructive/40 shadow-md'
          : 'ring-2 ring-primary/40 shadow-md')
      )}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn('flex items-center gap-2 mb-1', expanded && 'flex-wrap')}>
            <motion.p
              layout
              className={cn(
                notification.read ? 'font-medium' : 'font-semibold',
                expanded ? 'text-base whitespace-normal' : 'text-sm truncate',
                cancelled && 'text-destructive',
                !cancelled && !notification.read && 'text-foreground',
                notification.read && !cancelled && 'text-foreground/85'
              )}
            >
              {notification.subject}
            </motion.p>
            <Badge
              variant={cancelled ? 'destructive' : notification.read ? 'secondary' : 'default'}
              className="text-[10px] shrink-0"
            >
              {TYPE_LABELS[notification.type] || notification.type}
            </Badge>
          </div>
          <motion.div
            layout
            initial={false}
            animate={{ height: expanded ? 'auto' : '2.5rem' }}
            transition={
              expanded
                ? { duration: 0.28, ease: 'easeOut' }
                : { type: 'spring', stiffness: 420, damping: 32 }
            }
            className="overflow-hidden"
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
          </motion.div>
        </div>
        <AnimatePresence mode="wait">
          {!notification.read && !isExiting && (
            <motion.span
              key="dot"
              initial={{ scale: 0 }}
              animate={{ scale: pendingRead ? [1, 1.35, 1] : 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={
                pendingRead
                  ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
              className={cn(
                'mt-1 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background',
                cancelled ? 'bg-destructive' : 'bg-primary'
              )}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pendingRead && (
          <ReadCountdown pendingRead={pendingRead} cancelled={cancelled} />
        )}
      </AnimatePresence>

      {notification.createdAt && !pendingRead && (
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
    </motion.button>
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
  const [pendingReadId, setPendingReadId] = useState(null);
  const [exitingReadId, setExitingReadId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const readTimerRef = useRef(null);

  const clearReadTimer = () => {
    if (readTimerRef.current) {
      clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    }
    setPendingReadId(null);
    setExitingReadId(null);
  };

  useEffect(() => () => clearReadTimer(), []);

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

  const handleExitComplete = (notificationId) => {
    if (exitingReadId === notificationId) {
      markAsRead(notificationId);
      setExitingReadId(null);
      setExpandedId((current) => (current === notificationId ? null : current));
    }
  };

  const handleNotificationClick = (notification) => {
    if (exitingReadId === notification.id) {
      return;
    }

    if (expandedId === notification.id) {
      clearReadTimer();
      setExpandedId(null);
      return;
    }

    clearReadTimer();
    setExpandedId(notification.id);

    if (!notification.read) {
      setPendingReadId(notification.id);
      readTimerRef.current = setTimeout(() => {
        setPendingReadId(null);
        setExitingReadId(notification.id);
        readTimerRef.current = null;
      }, READ_BEFORE_MARK_MS);
    }
  };

  const renderList = (items, { emptyMessage, showExit = false }) => {
    if (items.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <motion.div layout className="px-1 py-1">
        <AnimatePresence initial={false}>
          {items.map((notification) => {
            const exiting = showExit && exitingReadId === notification.id;

            return (
              <motion.div
                key={notification.id}
                layout
                className="m-1 origin-top overflow-hidden"
                initial={false}
                animate={
                  exiting
                    ? { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }
                    : { height: 'auto', opacity: 1 }
                }
                transition={{
                  height: { duration: EXIT_ANIMATION_MS / 1000, ease: EXIT_EASE },
                  opacity: { duration: (EXIT_ANIMATION_MS - 80) / 1000, ease: 'easeIn' },
                  margin: { duration: EXIT_ANIMATION_MS / 1000, ease: EXIT_EASE },
                  layout: { duration: 0.28, ease: EXIT_EASE },
                }}
                onAnimationComplete={() => {
                  if (exiting) {
                    handleExitComplete(notification.id);
                  }
                }}
              >
                <motion.div
                  initial={false}
                  animate={
                    exiting
                      ? { opacity: 0, y: -14, scale: 0.94, rotateX: -6 }
                      : { opacity: 1, y: 0, scale: 1, rotateX: 0 }
                  }
                  transition={{
                    duration: EXIT_ANIMATION_MS / 1000,
                    ease: EXIT_EASE,
                  }}
                  style={{ perspective: 600, transformOrigin: 'top center' }}
                >
                  <NotificationItem
                    notification={notification}
                    expanded={expandedId === notification.id}
                    pendingRead={pendingReadId === notification.id}
                    isExiting={exiting}
                    onClick={() => handleNotificationClick(notification)}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    );
  };

  const handlePanelOpenChange = (open) => {
    setPanelOpen(open);
    if (open) {
      refreshNotifications();
      setUnreadOpen(unreadCount > 0);
      setReadOpen(unreadCount === 0 && read.length > 0);
    } else {
      clearReadTimer();
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
                clearReadTimer();
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
                showExit: true,
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
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
};

export default NotificationBell;
