import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Expand,
  Inbox,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { EmptyWidget } from '@/pages/shared/dashboard';
import { DashboardHint } from '@/pages/shared/dashboard/DashboardHint';
import { WidgetListPagination } from '@/pages/shared/dashboard/WidgetListPagination';

const PREVIEW_LIMIT = 5;
const PAGE_SIZE = 10;

const STAGE_SECTIONS = {
  awaiting: 'awaitingReceived',
  reviewer: 'awaitingReviewer',
  incomplete: 'reviewIncomplete',
};

const STAGES = [
  {
    key: 'awaiting',
    title: 'Awaiting Submission',
    hint: 'Assessment was sent; waiting for the candidate to submit their work.',
    helper: 'Sent to candidate',
    icon: Inbox,
    accent: {
      column: 'bg-amber-50/80 border-amber-200/70 dark:bg-amber-950/20 dark:border-amber-900/50',
      header: 'text-amber-900 dark:text-amber-100',
      count: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800',
      bar: 'bg-amber-500',
      card: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    empty: 'No assessments awaiting submission',
  },
  {
    key: 'reviewer',
    title: 'Needs reviewer',
    hint: 'Submission is in; assign reviewers so evaluation can start.',
    helper: 'Received, unassigned',
    icon: UserPlus,
    accent: {
      column: 'bg-sky-50/80 border-sky-200/70 dark:bg-sky-950/20 dark:border-sky-900/50',
      header: 'text-sky-900 dark:text-sky-100',
      count: 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-900/50 dark:text-sky-100 dark:border-sky-800',
      bar: 'bg-sky-500',
      card: 'hover:border-sky-300 dark:hover:border-sky-700',
    },
    empty: 'No assessments need a reviewer',
  },
  {
    key: 'incomplete',
    title: 'Review incomplete',
    hint: 'Reviewers are assigned but at least one review is still outstanding.',
    helper: 'Waiting on reviewers',
    icon: ClipboardCheck,
    accent: {
      column: 'bg-violet-50/80 border-violet-200/70 dark:bg-violet-950/20 dark:border-violet-900/50',
      header: 'text-violet-900 dark:text-violet-100',
      count: 'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-900/50 dark:text-violet-100 dark:border-violet-800',
      bar: 'bg-violet-500',
      card: 'hover:border-violet-300 dark:hover:border-violet-700',
    },
    empty: 'No reviews in progress',
  },
];

const agingTone = (days) => {
  if (days >= 7) return 'text-destructive bg-destructive/10 border-destructive/25';
  if (days >= 3) {
    return 'text-amber-800 bg-amber-100 border-amber-200 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
  }
  return 'text-muted-foreground bg-muted/60 border-border';
};

const AssessmentCard = ({ item, accentClass, formatDateTime, onOpen }) => {
  const days = item.agingDays ?? 0;

  return (
    <button
      type="button"
      onClick={() => item.candidateId && onOpen(item.candidateId)}
      className={cn(
        'group w-full text-left rounded-lg border bg-background/90 p-3 shadow-sm transition-all',
        'hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        accentClass
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate leading-snug">{item.candidateName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.interviewType || 'Assessment'}
            {item.departmentName ? ` · ${item.departmentName}` : ''}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn('shrink-0 tabular-nums text-[10px] px-1.5', agingTone(days))}
        >
          {days}d
        </Badge>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {item.dueEnd ? <span>Due {formatDateTime(item.dueEnd)}</span> : null}
        {item.reviewerCount > 0 ? (
          <span>
            {item.reviewerCount} reviewer{item.reviewerCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-xs font-medium text-foreground/90 truncate">
          {item.nextAction || 'Open candidate'}
        </span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </button>
  );
};

AssessmentCard.propTypes = {
  item: PropTypes.object.isRequired,
  accentClass: PropTypes.string,
  formatDateTime: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const StageColumn = ({ stage, bucket, formatDateTime, onOpen, onLoadPage }) => {
  const Icon = stage.icon;
  const count = bucket.count ?? 0;
  const items = Array.isArray(bucket.items) ? bucket.items : [];
  const hasItems = count > 0;
  const serverPaged = typeof onLoadPage === 'function';

  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [serverItems, setServerItems] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState(null);

  const previewItems = useMemo(() => items.slice(0, PREVIEW_LIMIT), [items]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const clientPageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);
  const pageItems = serverPaged ? serverItems : clientPageItems;

  const fetchPage = useCallback(
    async (nextPage) => {
      if (!serverPaged) {
        setPage(nextPage);
        return;
      }
      setPageLoading(true);
      setPageError(null);
      try {
        const res = await onLoadPage(STAGE_SECTIONS[stage.key], nextPage - 1, PAGE_SIZE);
        setServerItems(Array.isArray(res?.items) ? res.items : []);
        setPage(nextPage);
      } catch (err) {
        setPageError(err?.response?.data?.message || err?.message || 'Failed to load page');
      } finally {
        setPageLoading(false);
      }
    },
    [onLoadPage, serverPaged, stage.key]
  );

  useEffect(() => {
    if (!modalOpen) {
      setPage(1);
      setPageError(null);
      return;
    }
    if (serverPaged) fetchPage(1);
    // Fetch only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const openModal = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!hasItems) return;
    setModalOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-col rounded-xl border min-h-[220px] overflow-hidden',
          stage.accent.column
        )}
      >
        <div className={cn('px-3 py-2.5 border-b border-inherit/60', stage.accent.header)}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/70 border border-inherit/40">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{stage.title}</p>
                <DashboardHint text={stage.hint} />
                <Badge
                  variant="outline"
                  className={cn('tabular-nums text-[10px] h-5 px-1.5', stage.accent.count)}
                >
                  {count}
                </Badge>
              </div>
              <p className="text-[11px] opacity-70 truncate">{stage.helper}</p>
            </div>
            {hasItems ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                title={`View all ${stage.title}`}
                aria-label={`Expand ${stage.title}`}
                onClick={openModal}
              >
                <Expand className="w-3.5 h-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[340px]">
          {count === 0 ? (
            <div className="h-full min-h-[120px] flex items-center justify-center px-2">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                {stage.empty}
              </p>
            </div>
          ) : (
            <>
              {previewItems.map((item, idx) => (
                <AssessmentCard
                  key={item.scheduleId || `${stage.key}-${idx}`}
                  item={item}
                  accentClass={stage.accent.card}
                  formatDateTime={formatDateTime}
                  onOpen={onOpen}
                />
              ))}
              {count > previewItems.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={openModal}
                >
                  View all {count}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg w-[min(96vw,32rem)] p-0 gap-0">
          <DialogHeader className="px-5 py-4">
            <DialogTitle className="text-lg">{stage.title}</DialogTitle>
            <DialogDescription>
              {count} item{count === 1 ? '' : 's'} · page {page} of {totalPages}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-5 py-3 space-y-2 min-h-[12rem] max-h-[60vh] overflow-y-auto">
            {pageLoading ? (
              <LoadingState label="Loading…" size="sm" minHeight="sm" />
            ) : pageError ? (
              <p className="text-sm text-destructive">{pageError}</p>
            ) : (
              pageItems.map((item, idx) => (
                <AssessmentCard
                  key={item.scheduleId || `${stage.key}-modal-${idx}`}
                  item={item}
                  accentClass={stage.accent.card}
                  formatDateTime={formatDateTime}
                  onOpen={(candidateId) => {
                    setModalOpen(false);
                    onOpen(candidateId);
                  }}
                />
              ))
            )}
          </DialogBody>
          <DialogFooter className="px-5 py-3 sm:justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + (pageItems.length ? 1 : 0)}–
              {(page - 1) * PAGE_SIZE + pageItems.length} of {count}
            </p>
            <WidgetListPagination page={page} totalPages={totalPages} onPageChange={fetchPage} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

StageColumn.propTypes = {
  stage: PropTypes.object.isRequired,
  bucket: PropTypes.shape({
    count: PropTypes.number,
    items: PropTypes.array,
  }).isRequired,
  formatDateTime: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  onLoadPage: PropTypes.func,
};

export const AssessmentsWaitingBoard = ({
  awaitingReceived,
  awaitingReviewer,
  reviewIncomplete,
  total,
  formatDateTime,
  onOpenCandidate,
  onLoadPage,
}) => {
  if (total === 0) {
    return (
      <EmptyWidget
        icon={CheckCircle2}
        title="No assessments waiting"
        description="Sent, received, and in-review assessments will appear here"
      />
    );
  }

  const buckets = {
    awaiting: awaitingReceived,
    reviewer: awaitingReviewer,
    incomplete: reviewIncomplete,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {STAGES.map((stage, i) => {
          const count = buckets[stage.key]?.count ?? 0;
          return (
            <div key={stage.key} className="flex items-center gap-1.5 shrink-0">
              {i > 0 ? (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 mx-0.5" />
              ) : null}
              <div className="flex items-center gap-2 rounded-full border bg-card px-2.5 py-1">
                <span className={cn('h-2 w-2 rounded-full', stage.accent.bar)} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {stage.title}
                </span>
                <span className="text-xs font-semibold tabular-nums">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            bucket={buckets[stage.key]}
            formatDateTime={formatDateTime}
            onOpen={onOpenCandidate}
            onLoadPage={onLoadPage}
          />
        ))}
      </div>
    </div>
  );
};

AssessmentsWaitingBoard.propTypes = {
  awaitingReceived: PropTypes.object.isRequired,
  awaitingReviewer: PropTypes.object.isRequired,
  reviewIncomplete: PropTypes.object.isRequired,
  total: PropTypes.number.isRequired,
  formatDateTime: PropTypes.func.isRequired,
  onOpenCandidate: PropTypes.func.isRequired,
  onLoadPage: PropTypes.func,
};

export default AssessmentsWaitingBoard;
