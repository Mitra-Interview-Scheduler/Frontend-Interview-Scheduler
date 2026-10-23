import { useEffect, useState, useSyncExternalStore } from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { isServerReachable, subscribeServerStatus } from '@/lib/serverStatus';

const useOnline = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
};

/**
 * Floating notice while the browser is offline or API requests can't reach the server.
 * Clears itself as soon as a request succeeds again.
 */
const ConnectionBanner = () => {
  const online = useOnline();
  const serverReachable = useSyncExternalStore(subscribeServerStatus, isServerReachable);
  const { serverUnavailable } = useAuth();

  // The full-screen "server unavailable" page already explains the problem
  if (serverUnavailable || (online && serverReachable)) {
    return null;
  }

  const Icon = online ? CloudOff : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1">
        {online
          ? "Can't reach the Mitra server. Changes may not save and some data may be out of date."
          : "You're offline. Changes won't save until your connection is back."}
      </p>
      <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="shrink-0 gap-1">
        <RefreshCw className="h-3.5 w-3.5" />
        Reload
      </Button>
    </div>
  );
};

export default ConnectionBanner;
