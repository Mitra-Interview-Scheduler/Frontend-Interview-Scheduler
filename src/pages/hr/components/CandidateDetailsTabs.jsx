import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getCandidateDetailTabs } from './candidateDetailsTabsConfig';
import { resolveInterviewRequestStatus } from '@/lib/candidateInterviews';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { cn } from '@/lib/utils';

const CandidateDetailsTabs = ({
  candidate,
  steps = [],
  stepsLoading = false,
  interviews = [],
  panels = [],
  interviewsLoading = false,
  interviewsError = null,
  onInterviewsRefresh = () => {},
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
  onDocumentUploaded = () => {},
  onCandidateUpdated = () => {},
}) => {
  const visibleTabs = useMemo(
    () => getCandidateDetailTabs(candidate?.status, interviews, panels),
    [candidate?.status, interviews, panels],
  );

  const [activeTab, setActiveTab] = useState('');
  const tabsListRef = useRef(null);

  useEffect(() => {
    if (!candidate?.id) return undefined;
    onInterviewsRefresh();
    return undefined;
  }, [candidate?.id, activeTab, onInterviewsRefresh]);

  useEffect(() => {
    if (!activeTab || !tabsListRef.current) return;
    const activeTrigger = tabsListRef.current.querySelector('[data-state="active"]');
    activeTrigger?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (visibleTabs.length === 0) {
      setActiveTab('');
      return;
    }
    setActiveTab((current) => (
      visibleTabs.some((tab) => tab.value === current) ? current : visibleTabs[0].value
    ));
  }, [visibleTabs]);

  if (!candidate) {
    return <div className="text-center text-gray-500">No candidate data available</div>;
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500">
        <p>No details to display for the current stage.</p>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-w-0 w-full flex-col overflow-hidden">
      {interviewsError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{interviewsError}</span>
          <Button variant="outline" size="sm" onClick={onInterviewsRefresh} className="shrink-0 border-red-300 text-red-800 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}
      <div className="sticky top-0 z-10 shrink-0 pb-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 rounded-l-xl bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 rounded-r-xl bg-gradient-to-l from-white to-transparent" />
          <TabsList
            ref={tabsListRef}
            className="candidate-tabs-scroll horizontal-scroll-friendly relative flex h-auto w-full min-w-0 items-center justify-start gap-1.5 overflow-x-auto scroll-smooth rounded-xl border border-blue-200 bg-white p-1.5 pb-2 shadow-sm"
          >
            {visibleTabs.map((tab) => {
              const isInterviewTab = Boolean(tab.interview || tab.isPanelTab);
              const isCancelled = tab.isPanelTab
                ? (tab.panelRequests || []).every(
                  (request) => resolveInterviewRequestStatus(request) === InterviewScheduleStatus.CANCELLED,
                )
                : isInterviewTab
                  && resolveInterviewRequestStatus(tab.interview) === InterviewScheduleStatus.CANCELLED;

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  title={tab.label}
                  className={cn(
                    'h-9 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-all',
                    isCancelled
                      ? 'text-red-700 data-[state=inactive]:border data-[state=inactive]:border-red-200 data-[state=inactive]:bg-red-50/80 data-[state=active]:bg-red-50 data-[state=active]:text-red-800 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-red-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-blue-200',
                    isInterviewTab && !isCancelled && tab.isPanelTab && 'data-[state=inactive]:border data-[state=inactive]:border-sky-200 data-[state=inactive]:bg-sky-50/50 data-[state=active]:bg-sky-50 data-[state=active]:text-sky-900 data-[state=active]:ring-sky-200',
                    isInterviewTab && !isCancelled && !tab.isPanelTab && 'data-[state=inactive]:border data-[state=inactive]:border-cyan-100 data-[state=inactive]:bg-cyan-50/40 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-800 data-[state=active]:ring-cyan-200',
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>
      {visibleTabs.map((tab) => {
        const TabComponent = tab.component;
        const isReadOnly = !tab.editableStages.includes(candidate.status);
        return (
          <TabsContent key={tab.value} value={tab.value} className="mt-0 flex-1 overflow-y-auto pr-4">
            <TabComponent
              candidate={candidate}
              interview={tab.interview}
              panel={tab.panel}
              panelRequests={tab.panelRequests}
              steps={steps}
              stepsLoading={stepsLoading || interviewsLoading}
              isActive={activeTab === tab.value}
              readOnly={isReadOnly}
              documents={documents}
              documentsLoading={documentsLoading}
              onPreviewDocument={onPreviewDocument}
              onDownloadDocument={onDownloadDocument}
              onDocumentUploaded={onDocumentUploaded}
              onCandidateUpdated={onCandidateUpdated}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default CandidateDetailsTabs;
