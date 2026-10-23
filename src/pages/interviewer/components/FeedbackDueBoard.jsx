import PropTypes from 'prop-types';
import { ArrowRight, CheckCircle2, MessageSquare, PenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DashboardSection,
  PaginatedWidgetList,
} from '@/pages/shared/dashboard';
import { cn } from '@/lib/utils';

const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const formatWait = (hours) => {
  if (hours == null || Number.isNaN(Number(hours))) return 'Waiting';
  const h = Number(hours);
  if (h < 1) return 'Just ended';
  if (h < 24) return `${Math.round(h)}h waiting`;
  const days = Math.round(h / 24);
  return `${days}d waiting`;
};

const urgencyFor = (hours) => {
  const h = Number(hours) || 0;
  if (h >= 48) {
    return {
      key: 'overdue',
      label: 'Overdue',
      row: 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10',
      bar: 'bg-destructive',
      avatar: 'bg-destructive/15 text-destructive',
      badge: 'bg-destructive/10 text-destructive border-destructive/25',
    };
  }
  if (h >= 24) {
    return {
      key: 'late',
      label: '1d+ waiting',
      row: 'border-amber-300/70 bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60 dark:hover:bg-amber-950/30',
      bar: 'bg-amber-500',
      avatar: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
      badge:
        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800',
    };
  }
  return {
    key: 'due',
    label: 'Due now',
    row: 'border-primary/25 bg-primary/5 hover:bg-primary/10',
    bar: 'bg-primary',
    avatar: 'bg-primary/15 text-primary',
    badge: 'bg-primary/10 text-primary border-primary/20',
  };
};

function FeedbackDueRow({ item, onOpen, formatDateTime }) {
  const urgency = urgencyFor(item.hoursSince);
  const typeLabel = item.interviewType || item.formName || 'Interview';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border pl-3 pr-3 py-3 transition-colors',
        urgency.row
      )}
    >
      <span
        className={cn('absolute inset-y-0 left-0 w-1', urgency.bar)}
        aria-hidden
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              urgency.avatar
            )}
            aria-hidden
          >
            {initials(item.candidateName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold truncate">{item.candidateName || 'Candidate'}</p>
              <Badge variant="outline" className={cn('text-[10px] border', urgency.badge)}>
                {urgency.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{typeLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatWait(item.hoursSince)}
              {item.endedAt ? ` · ended ${formatDateTime(item.endedAt)}` : ''}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-10 gap-1.5 shrink-0 w-full sm:w-auto"
          onClick={() => onOpen(item.scheduleId)}
        >
          <PenLine className="w-4 h-4" />
          Write feedback
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

FeedbackDueRow.propTypes = {
  item: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
  formatDateTime: PropTypes.func.isRequired,
};

export function FeedbackDueBoard({
  items,
  count,
  overdueCount,
  onLoadPage,
  onOpen,
  formatDateTime,
}) {
  const total = count ?? 0;
  // Total from the server (all overdue items), not just the ones in this preview page.
  const overdue = Number.isFinite(overdueCount)
    ? overdueCount
    : (Array.isArray(items) ? items : []).filter((item) => Number(item.hoursSince) >= 24).length;

  return (
    <DashboardSection
      title="Feedback due"
      icon={MessageSquare}
      hint="Submit feedback soon after the interview while details are still fresh. Older items are highlighted first."
      description={
        total === 0
          ? 'No outstanding interview write-ups'
          : `${total} interview${total === 1 ? '' : 's'} waiting on your write-up`
      }
      actions={
        overdue > 0 ? (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
            {overdue} waiting over a day
          </Badge>
        ) : null
      }
    >
      <PaginatedWidgetList
        items={items}
        count={count}
        pageSize={5}
        onLoadPage={onLoadPage}
        emptyTitle="You're caught up"
        emptyDescription="Completed interviews waiting for your feedback will appear here."
        emptyIcon={CheckCircle2}
        getItemKey={(item) => item.scheduleId}
        renderItem={(item) => (
          <FeedbackDueRow item={item} onOpen={onOpen} formatDateTime={formatDateTime} />
        )}
      />
    </DashboardSection>
  );
}

FeedbackDueBoard.propTypes = {
  items: PropTypes.array,
  count: PropTypes.number,
  overdueCount: PropTypes.number,
  onLoadPage: PropTypes.func,
  onOpen: PropTypes.func.isRequired,
  formatDateTime: PropTypes.func.isRequired,
};

export default FeedbackDueBoard;
