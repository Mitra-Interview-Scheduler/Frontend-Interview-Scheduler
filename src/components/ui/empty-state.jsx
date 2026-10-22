import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Shared empty-state for lists, cards, and panels.
 * Keep copy short; pass an optional action for create/filter CTAs.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center text-muted-foreground',
        compact ? 'gap-2 py-8' : 'gap-3 py-12',
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            'text-muted-foreground/50',
            compact ? 'h-8 w-8' : 'h-12 w-12'
          )}
          aria-hidden
        />
      ) : null}
      {title ? (
        <p className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
      ) : null}
      {description ? (
        <p className={cn('max-w-sm text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      ) : null}
      {action || (actionLabel && onAction) ? (
        <div className="mt-1">
          {action || (
            <Button type="button" size={compact ? 'sm' : 'default'} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  action: PropTypes.node,
  className: PropTypes.string,
  compact: PropTypes.bool,
};
