import PropTypes from 'prop-types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Table-style skeleton for list pages while data loads. */
export function TableSkeleton({ rows = 6, columns = 4, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('space-y-3', className)}
    >
      <span className="sr-only">Loading</span>
      <div className="hidden gap-3 rounded-lg border bg-card p-4 lg:grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-3 rounded-lg border bg-card p-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: Math.min(columns, 3) }).map((_, col) => (
            <Skeleton
              key={`${row}-${col}`}
              className={cn('h-4', col === 0 ? 'w-3/4' : 'w-full')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
  className: PropTypes.string,
};

/** Compact card/stat skeleton row. */
export function CardSkeleton({ className }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn('rounded-lg border bg-card p-4 space-y-3', className)}
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

CardSkeleton.propTypes = {
  className: PropTypes.string,
};

/** Dashboard stats grid skeleton. */
export function StatCardsSkeleton({ count = 4, className }) {
  return (
    <div
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

StatCardsSkeleton.propTypes = {
  count: PropTypes.number,
  className: PropTypes.string,
};
