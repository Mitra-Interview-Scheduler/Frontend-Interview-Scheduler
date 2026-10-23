import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Expand, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EmptyWidget } from './EmptyWidget';
import { DashboardHint } from './DashboardHint';
import { WidgetListPagination } from './WidgetListPagination';

const PREVIEW_LIMIT = 5;
const PAGE_SIZE = 10;

const severityStyles = {
  critical: {
    border: 'border-destructive/40',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    accent: 'bg-destructive/10 text-destructive',
  },
  warning: {
    border: 'border-amber-400/50',
    badge:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    accent: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  },
  info: {
    border: 'border-primary/30',
    badge: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-primary/10 text-primary',
  },
  default: {
    border: 'border-border',
    badge: 'bg-muted text-muted-foreground border-border',
    accent: 'bg-muted text-muted-foreground',
  },
};

/**
 * Action-queue alert card.
 * Shows a preview of the latest items. Expand opens a paginated modal.
 * Pass onLoadPage to fetch pages from the server instead of slicing local items.
 */
export function ActionQueueCard({
  title,
  count,
  severity = 'default',
  icon: Icon,
  hint,
  items,
  renderItem,
  getItemKey,
  children,
  onHeaderClick,
  className,
  emptyMessage = 'No data available',
  emptyDescription = 'Nothing needs attention in this queue right now.',
  previewLimit = PREVIEW_LIMIT,
  pageSize = PAGE_SIZE,
  onLoadPage,
}) {
  const list = Array.isArray(items) ? items : null;
  const resolvedCount = count ?? (list ? list.length : 0);
  const hasItems = resolvedCount > 0;
  const serverPaged = typeof onLoadPage === 'function';
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [serverItems, setServerItems] = useState([]);
  const [serverCount, setServerCount] = useState(resolvedCount);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const styles = severityStyles[severity] || severityStyles.default;

  const previewItems = useMemo(
    () => (list ? list.slice(0, previewLimit) : []),
    [list, previewLimit]
  );

  const totalForModal = serverPaged ? serverCount : resolvedCount;
  const totalPages = Math.max(1, Math.ceil(totalForModal / pageSize));

  const clientPageItems = useMemo(() => {
    if (!list) return [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  const pageItems = serverPaged ? serverItems : clientPageItems;

  const resolveKey = (item, index) => {
    if (typeof getItemKey === 'function') return getItemKey(item, index);
    return item?.id ?? item?.scheduleId ?? item?.candidateId ?? item?.userId ?? index;
  };

  const fetchServerPage = useCallback(
    async (nextPage) => {
      if (!serverPaged) return;
      setPageLoading(true);
      setPageError(null);
      try {
        const res = await onLoadPage(nextPage - 1, pageSize);
        setServerItems(Array.isArray(res?.items) ? res.items : []);
        setServerCount(res?.count ?? resolvedCount);
        setPage(nextPage);
      } catch (err) {
        setPageError(err?.response?.data?.message || err?.message || 'Failed to load page');
      } finally {
        setPageLoading(false);
      }
    },
    [onLoadPage, pageSize, resolvedCount, serverPaged]
  );

  useEffect(() => {
    if (!modalOpen) {
      setPage(1);
      setPageError(null);
      return;
    }
    if (serverPaged) {
      fetchServerPage(1);
    }
    // Fetch only when the modal opens, not when parent callbacks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const openModal = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!hasItems || !list || !renderItem) return;
    setModalOpen(true);
  };

  const handlePageChange = (nextPage) => {
    if (serverPaged) fetchServerPage(nextPage);
    else setPage(nextPage);
  };

  const renderList = (source, inModal = false) => {
    if (!renderItem) return null;
    if (!source.length) {
      return (
        <EmptyWidget
          icon={Inbox}
          title={emptyMessage}
          description={emptyDescription}
          className="py-6"
        />
      );
    }
    return source.map((item, index) => (
      <div key={resolveKey(item, index)}>{renderItem(item, { inModal, index })}</div>
    ));
  };

  const inlineContent = list && renderItem ? (
    hasItems ? (
      renderList(previewItems, false)
    ) : (
      <EmptyWidget
        icon={Inbox}
        title={emptyMessage}
        description={emptyDescription}
        className="py-5"
      />
    )
  ) : (
    children || (
      <EmptyWidget
        icon={Inbox}
        title={emptyMessage}
        description={emptyDescription}
        className="py-5"
      />
    )
  );

  const showExpandIcon = Boolean(list && renderItem && hasItems);
  const showViewAll = hasItems && resolvedCount > previewItems.length;

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-shadow hover:shadow-md',
          styles.border,
          hasItems ? 'border-2' : 'border',
          className
        )}
      >
        <CardHeader
          className={cn(
            'py-3 px-4',
            onHeaderClick ? 'cursor-pointer select-none hover:bg-accent/40' : ''
          )}
          onClick={onHeaderClick}
          role={onHeaderClick ? 'button' : undefined}
          tabIndex={onHeaderClick ? 0 : undefined}
          onKeyDown={
            onHeaderClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onHeaderClick();
                  }
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {Icon ? (
                <div className={cn('p-1.5 rounded-md shrink-0', styles.accent)}>
                  <Icon className="w-4 h-4" />
                </div>
              ) : null}
              <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
              <DashboardHint text={hint} />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={cn('border text-xs tabular-nums', styles.badge)}>
                {resolvedCount}
              </Badge>
              {showExpandIcon ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title={`View all ${title}`}
                  aria-label={`Expand ${title}`}
                  onClick={openModal}
                >
                  <Expand className="w-3.5 h-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 px-4 space-y-2 max-h-72 overflow-y-auto">
          {inlineContent}
          {showViewAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={openModal}
            >
              View all {resolvedCount}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {list && renderItem ? (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg w-[min(96vw,32rem)] p-0 gap-0">
            <DialogHeader className="px-5 py-4">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>
                {totalForModal} item{totalForModal === 1 ? '' : 's'} · page {page} of {totalPages}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="px-5 py-3 space-y-2 min-h-[12rem]">
              {pageLoading ? (
                <LoadingState label="Loading…" size="sm" minHeight="sm" />
              ) : pageError ? (
                <p className="text-sm text-destructive">{pageError}</p>
              ) : (
                renderList(pageItems, true)
              )}
            </DialogBody>
            <DialogFooter className="px-5 py-3 sm:justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + (pageItems.length ? 1 : 0)}–
                {(page - 1) * pageSize + pageItems.length} of {totalForModal}
              </p>
              <WidgetListPagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

ActionQueueCard.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  severity: PropTypes.oneOf(['critical', 'warning', 'info', 'default']),
  icon: PropTypes.elementType,
  hint: PropTypes.node,
  items: PropTypes.array,
  renderItem: PropTypes.func,
  getItemKey: PropTypes.func,
  children: PropTypes.node,
  onHeaderClick: PropTypes.func,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  emptyDescription: PropTypes.string,
  previewLimit: PropTypes.number,
  pageSize: PropTypes.number,
  onLoadPage: PropTypes.func,
};

export default ActionQueueCard;
