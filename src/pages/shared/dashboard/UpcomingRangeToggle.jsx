import PropTypes from 'prop-types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export const UPCOMING_DAY_OPTIONS = [7, 14, 30];

export function asCountedList(res) {
  return {
    count: res?.count ?? 0,
    items: Array.isArray(res?.items) ? res.items : [],
    page: res?.page ?? 0,
    size: res?.size,
    hasMore: Boolean(res?.hasMore),
  };
}

/**
 * Calendar-day window for dashboard widgets (weekends included).
 */
export function UpcomingRangeToggle({
  value,
  onChange,
  disabled,
  className,
  ariaLabel = 'Date range',
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={String(value)}
      onValueChange={(next) => {
        if (!next) return;
        onChange(Number(next));
      }}
      disabled={disabled}
      className={cn('justify-start rounded-md border bg-background p-0.5 gap-0.5', className)}
      aria-label={ariaLabel}
    >
      {UPCOMING_DAY_OPTIONS.map((days) => (
        <ToggleGroupItem
          key={days}
          value={String(days)}
          className="h-7 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          aria-label={`Next ${days} days`}
        >
          {days} days
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

UpcomingRangeToggle.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default UpcomingRangeToggle;
