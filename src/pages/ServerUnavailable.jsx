import PropTypes from 'prop-types';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPage from '@/components/StatusPage';
import { useAuth } from '@/context/AuthContext';

/** Shown instead of the app when the session can't be restored because the server is unreachable. */
const ServerUnavailable = () => {
  const { retrySession } = useAuth();
  return (
    <StatusPage
      icon={CloudOff}
      title="Can't reach Mitra"
      message={navigator.onLine
        ? 'The Mitra server is not responding right now. It may be restarting or under maintenance. Please try again in a moment.'
        : "You're offline. Check your internet connection and try again."}
      fullScreen
      actions={(
        // retrySession shows the app loader while it runs, then the app or this page again
        <Button size="lg" onClick={retrySession} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    />
  );
};

/** Renders the "server unavailable" page instead of the app when the session couldn't be restored. */
export const ServerAvailabilityGate = ({ children }) => {
  const { serverUnavailable } = useAuth();
  return serverUnavailable ? <ServerUnavailable /> : children;
};

ServerAvailabilityGate.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ServerUnavailable;
