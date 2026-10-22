import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * Compact metric pill for dashboard headers and summary rows.
 */
export function StatPill({ label, value, tone = 'default', className, onClick }) {
  const tones = {
    default: 'bg-muted text-foreground border-border',
    primary: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  };

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
        tones[tone] || tones.default,
        onClick && 'hover:opacity-90 transition-opacity cursor-pointer',
        className
      )}
    >
      <span className="font-semibold tabular-nums">{value ?? '—'}</span>
      <span className="text-muted-foreground font-medium">{label}</span>
    </Comp>
  );
}

StatPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tone: PropTypes.oneOf(['default', 'primary', 'warning', 'danger', 'success']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default StatPill;
