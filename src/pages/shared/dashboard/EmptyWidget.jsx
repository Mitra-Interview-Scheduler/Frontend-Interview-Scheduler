import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact empty state for dashboard widgets.
 */
export function EmptyWidget({
  icon: Icon = Inbox,
  title = 'Nothing to show',
  description,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-8 px-4 text-muted-foreground',
        className
      )}
    >
      {Icon ? <Icon className="w-8 h-8 mb-2 opacity-40" aria-hidden /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="text-xs mt-1 max-w-xs">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

EmptyWidget.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default EmptyWidget;
