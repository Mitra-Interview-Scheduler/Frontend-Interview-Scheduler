import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * Shared look for 404 / 403 / error / server-unavailable screens.
 * `fullScreen` is for pages rendered outside the app layout (no navbar/sidebar).
 */
const StatusPage = ({ code, icon: Icon, title, message, actions, fullScreen = false, className }) => (
  <div
    role="alert"
    className={cn(
      'flex items-center justify-center',
      fullScreen ? 'min-h-screen gradient-subtle' : 'min-h-[60vh]',
      className
    )}
  >
    <div className="max-w-lg space-y-6 p-8 text-center">
      {code ? (
        // background-image (not the .gradient-primary shorthand) so bg-clip-text still applies
        <div
          className="bg-clip-text text-8xl font-bold text-transparent sm:text-9xl"
          style={{ backgroundImage: 'var(--gradient-primary)' }}
        >
          {code}
        </div>
      ) : (
        Icon && (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
            <Icon className="h-8 w-8 text-white" />
          </div>
        )
      )}
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      {message && <p className="text-lg text-muted-foreground">{message}</p>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  </div>
);

StatusPage.propTypes = {
  code: PropTypes.string,
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  message: PropTypes.node,
  actions: PropTypes.node,
  fullScreen: PropTypes.bool,
  className: PropTypes.string,
};

export default StatusPage;
