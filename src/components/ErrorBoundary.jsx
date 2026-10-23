import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPage from '@/components/StatusPage';
import { useHomePath } from '@/hooks/useHomePath';

/**
 * Catches render errors so one broken page shows a recovery screen instead of a blank app.
 * Changing `resetKey` (e.g. the pathname) clears the error, so navigating away recovers.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fullScreen, homePath } = this.props;
    if (!error) {
      return children;
    }

    return (
      <StatusPage
        icon={AlertTriangle}
        title="Something went wrong"
        message="This page hit an unexpected error. Try again, or go back to your dashboard. If it keeps happening, please let the Mitra team know."
        fullScreen={fullScreen}
        actions={(
          <>
            <Button onClick={this.reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            {/* A plain anchor on the full-screen boundary: the router itself may be what broke. */}
            {fullScreen ? (
              <Button variant="outline" onClick={() => window.location.assign(homePath)} className="gap-2">
                <Home className="h-4 w-4" />
                Go to dashboard
              </Button>
            ) : (
              <Button variant="outline" asChild className="gap-2">
                <Link to={homePath}>
                  <Home className="h-4 w-4" />
                  Go to dashboard
                </Link>
              </Button>
            )}
          </>
        )}
      />
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  resetKey: PropTypes.string,
  fullScreen: PropTypes.bool,
  homePath: PropTypes.string,
};

ErrorBoundary.defaultProps = {
  fullScreen: false,
  homePath: '/',
};

/** Error boundary that resets on navigation and links "home" to the user's dashboard. */
export const RouteErrorBoundary = ({ children, fullScreen = false }) => {
  const { pathname } = useLocation();
  const homePath = useHomePath();
  return (
    <ErrorBoundary resetKey={pathname} fullScreen={fullScreen} homePath={homePath}>
      {children}
    </ErrorBoundary>
  );
};

RouteErrorBoundary.propTypes = {
  children: PropTypes.node,
  fullScreen: PropTypes.bool,
};

export default ErrorBoundary;
