import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react';
import { assessmentAPI } from '@/services/assessmentAPI';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { toast } from '@/hooks/use-toast';
import { LoadingState, LoadingSwap } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
const PAGE_SIZE = 5;

const formatPhaseLabel = (phase) => String(phase || 'ASSIGNED')
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/^\w/, (c) => c.toUpperCase());

const isCompletedAssessment = (item) => (
  String(item?.assessmentPhase || '').toUpperCase() === 'COMPLETED'
);

const paginate = (list, page) => {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    page: safePage,
    totalPages,
    slice: list.slice(start, start + PAGE_SIZE),
    start: list.length === 0 ? 0 : start + 1,
    end: Math.min(start + PAGE_SIZE, list.length),
  };
};

const AssessmentReviewRow = ({ item, formatDateTime, onOpen, completed }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 hover:bg-slate-50/80">
    <div className="min-w-0">
      <p className="font-semibold text-slate-900 truncate">
        {item.interviewTypeLabel || item.interviewType}
      </p>
      <p className="text-sm text-muted-foreground truncate">
        {item.candidateName}
        {!completed && item.dueStartDateTime ? (
          <span className="text-red-600 font-medium">
            {' · '}Due {formatDateTime(item.dueStartDateTime)}
          </span>
        ) : null}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className={`text-[10px] ${
            completed
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : ''
          }`}
        >
          {completed ? 'Completed' : formatPhaseLabel(item.assessmentPhase)}
        </Badge>
        {!completed && item.hasAssessmentFile && (
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
            File ready
          </Badge>
        )}
        {!completed && item.dueStartDateTime && (
          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
            Due
          </Badge>
        )}
      </div>
    </div>
    <Button
      onClick={() => onOpen(item.interviewScheduleId)}
      variant={completed ? 'outline' : 'default'}
      className="gap-1.5"
    >
      {completed ? 'View feedback' : 'Open feedback'} <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);

const ListPagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Pagination className="mt-4">
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
        {pages.map((p) => (
          <PaginationItem key={p}>
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
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
            className={page >= totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const AssessmentsToReviewPage = () => {
  const navigate = useNavigate();
  const { formatDateTime } = useFormattedDateTime();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');
  const [assignedPage, setAssignedPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    assessmentAPI.listMine()
      .then((data) => {
        if (active) setItems(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load assessments',
          variant: 'destructive',
        });
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const { assigned, completed } = useMemo(() => {
    const assignedList = [];
    const completedList = [];
    items.forEach((item) => {
      if (isCompletedAssessment(item)) completedList.push(item);
      else assignedList.push(item);
    });
    return { assigned: assignedList, completed: completedList };
  }, [items]);

  const assignedPageData = useMemo(
    () => paginate(assigned, assignedPage),
    [assigned, assignedPage],
  );
  const completedPageData = useMemo(
    () => paginate(completed, completedPage),
    [completed, completedPage],
  );

  useEffect(() => {
    setAssignedPage((p) => Math.min(p, assignedPageData.totalPages));
  }, [assignedPageData.totalPages]);

  useEffect(() => {
    setCompletedPage((p) => Math.min(p, completedPageData.totalPages));
  }, [completedPageData.totalPages]);

  const openFeedback = (scheduleId) => navigate(`/interviewer/feedback/${scheduleId}`);

  const renderList = (list, pageData, onPageChange, emptyLabel, completedTab) => {
    if (list.length === 0) {
      return (
        <EmptyState
          icon={completedTab ? CheckCircle2 : ClipboardList}
          title={emptyLabel}
          compact
        />
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Showing {pageData.start}–{pageData.end} of {list.length}
        </p>
        {pageData.slice.map((item) => (
          <AssessmentReviewRow
            key={item.interviewScheduleId}
            item={item}
            formatDateTime={formatDateTime}
            onOpen={openFeedback}
            completed={completedTab}
          />
        ))}
        <ListPagination
          page={pageData.page}
          totalPages={pageData.totalPages}
          onPageChange={onPageChange}
        />
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Assessments to review"
          description="Open an assessment to download the submission and complete the feedback form."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Assessment reviews
            </CardTitle>
            <CardDescription>
              Assigned reviews need your feedback. Completed reviews are finished assessments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSwap
              loading={loading && items.length === 0}
              fallback={<LoadingState label="Loading…" size="sm" minHeight="sm" />}
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="assigned" className="gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Assigned ({assigned.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed ({completed.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="assigned" className="mt-0">
                  {renderList(
                    assigned,
                    assignedPageData,
                    setAssignedPage,
                    'No assessments waiting for your review.',
                    false,
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  {renderList(
                    completed,
                    completedPageData,
                    setCompletedPage,
                    'No completed assessment reviews yet.',
                    true,
                  )}
                </TabsContent>
              </Tabs>
            </LoadingSwap>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AssessmentsToReviewPage;
