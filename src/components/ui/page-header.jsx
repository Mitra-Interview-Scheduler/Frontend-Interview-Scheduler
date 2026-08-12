import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * Consistent page title row used across admin/HR/interviewer screens.
 */
export function PageHeader({ title, description, actions, className, titleClassName }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className={cn('text-3xl font-bold tracking-tight text-foreground', titleClassName)}>
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
};
