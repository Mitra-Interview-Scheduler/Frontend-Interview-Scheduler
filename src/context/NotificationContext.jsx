import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { notificationAPI } from '@/services/notificationAPI';
import { getAccessToken } from '@/services/api';
import { env } from '@/config/env';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 15_000;

const getWsBaseUrl = () => env.API_ORIGIN;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        notificationAPI.getAll(),
        notificationAPI.getUnreadCount(),
      ]);
      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id) => {
    try {
      const updated = await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const syncUnread = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    const intervalId = window.setInterval(syncUnread, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', syncUnread);
    window.addEventListener('focus', syncUnread);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncUnread);
      window.removeEventListener('focus', syncUnread);
    };
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user) {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      return undefined;
    }

    const token = getAccessToken();
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        const [{ Client }, { default: SockJS }] = await Promise.all([
          import('@stomp/stompjs'),
          import('sockjs-client'),
        ]);

        if (cancelled) return;

        const client = new Client({
          webSocketFactory: () => new SockJS(`${getWsBaseUrl()}/ws`),
          reconnectDelay: 5000,
          heartbeatIncoming: 10_000,
          heartbeatOutgoing: 10_000,
          beforeConnect: () => {
            const currentToken = getAccessToken();
            if (currentToken) {
              client.connectHeaders = { Authorization: `Bearer ${currentToken}` };
            }
          },
          onConnect: () => {
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
            }

            subscriptionRef.current = client.subscribe('/user/queue/notifications', (message) => {
              try {
                const payload = JSON.parse(message.body);
                setNotifications((prev) => {
                  const withoutDuplicate = prev.filter((item) => item.id !== payload.id);
                  return [payload, ...withoutDuplicate].slice(0, 50);
                });
                if (!payload.read) {
                  setUnreadCount((prev) => prev + 1);
                }
              } catch (error) {
                console.error('Failed to parse notification message:', error);
              }
            });

            refreshUnreadCount();
          },
          onStompError: (frame) => {
            console.error('STOMP error:', frame.headers?.message || frame);
          },
          onWebSocketClose: () => {
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              subscriptionRef.current = null;
            }
          },
        });

        client.activate();
        clientRef.current = client;
      } catch (error) {
        console.error('Failed to connect notification WebSocket:', error);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [user, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, loading, refreshNotifications, refreshUnreadCount, markAsRead, markAllAsRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
