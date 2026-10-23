import PropTypes from 'prop-types';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const visiblePages = (page, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
};

export function WidgetListPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = visiblePages(page, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
            className={page <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
          />
        </PaginationItem>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const gap = prev != null && p - prev > 1;
          return (
            <PaginationItem key={p} className="flex items-center">
              {gap ? <span className="px-1 text-muted-foreground text-xs">…</span> : null}
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(p);
                }}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
            className={
              page >= totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

WidgetListPagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default WidgetListPagination;
