import PropTypes from 'prop-types';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Small “why is this here?” help icon for dashboard widgets.
 */
export function DashboardHint({ text, className, side = 'top' }) {
  if (!text) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground',
            'hover:text-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label="Why this is shown"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[260px] text-xs leading-relaxed bg-white text-slate-900 border border-slate-200 shadow-lg dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

DashboardHint.propTypes = {
  text: PropTypes.node,
  className: PropTypes.string,
  side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
};

export default DashboardHint;
