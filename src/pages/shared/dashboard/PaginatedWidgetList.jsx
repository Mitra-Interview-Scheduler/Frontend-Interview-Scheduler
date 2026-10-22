import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LoadingState } from '@/components/ui/loading';
import { EmptyWidget } from './EmptyWidget';
import { WidgetListPagination } from './WidgetListPagination';

const PAGE_SIZE = 5;

/**
 * List that shows a server-backed preview, then fetches extra pages on demand.
 */
export function PaginatedWidgetList({
  items,
  count,
  renderItem,
  getItemKey,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyIcon,
  onLoadPage,
  pageSize = PAGE_SIZE,
  className,
}) {
  const preview = Array.isArray(items) ? items : [];
  const total = count ?? preview.length;
  const [page, setPage] = useState(1);
  const [pageItems, setPageItems] = useState(preview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const serverPaged = typeof onLoadPage === 'function';

  useEffect(() => {
    setPage(1);
    setPageItems(preview);
    setError(null);
  }, [items, count]);

  const handlePageChange = useCallback(
    async (nextPage) => {
      if (!serverPaged) {
        const start = (nextPage - 1) * pageSize;
        setPageItems(preview.slice(start, start + pageSize));
        setPage(nextPage);
        return;
      }
      if (nextPage === 1 && preview.length) {
        setPageItems(preview);
        setPage(1);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await onLoadPage(nextPage - 1, pageSize);
        setPageItems(Array.isArray(res?.items) ? res.items : []);
        setPage(nextPage);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    },
    [onLoadPage, pageSize, preview, serverPaged]
  );

  if (total === 0) {
    return <EmptyWidget icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={className}>
      {loading ? (
        <LoadingState label="Loading…" size="sm" minHeight="sm" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="space-y-3">
          {pageItems.map((item, index) => (
            <div key={getItemKey ? getItemKey(item, index) : item?.scheduleId ?? item?.id ?? index}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 ? (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + (pageItems.length ? 1 : 0)}–
            {(page - 1) * pageSize + pageItems.length} of {total}
          </p>
          <WidgetListPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      ) : null}
    </div>
  );
}

PaginatedWidgetList.propTypes = {
  items: PropTypes.array,
  count: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
  getItemKey: PropTypes.func,
  emptyTitle: PropTypes.string,
  emptyDescription: PropTypes.string,
  emptyIcon: PropTypes.elementType,
  onLoadPage: PropTypes.func,
  pageSize: PropTypes.number,
  className: PropTypes.string,
};

export default PaginatedWidgetList;
