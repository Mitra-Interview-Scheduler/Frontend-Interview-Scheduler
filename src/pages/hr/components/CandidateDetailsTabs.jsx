import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCandidateDetailTabs } from './candidateDetailsTabsConfig';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { collectCandidateInterviewRequests } from '@/lib/candidateInterviews';
import { cn } from '@/lib/utils';

const CandidateDetailsTabs = ({
  candidate,
  steps = [],
  stepsLoading = false,
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
  onDocumentUploaded = () => {},
  onCandidateUpdated = () => {},
}) => {
  const [interviews, setInterviews] = useState([]);
  const [panels, setPanels] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.id) {
      setInterviews([]);
      setPanels([]);
      return undefined;
    }

    let cancelled = false;
    const loadInterviews = async () => {
      setInterviewsLoading(true);
      try {
        const [interviewData, panelData] = await Promise.all([
          hrAvailabilityAPI.getInterviewsForCandidate(candidate.id),
          hrAvailabilityAPI.getPanelsByCandidateId(candidate.id),
        ]);
        if (!cancelled) {
          setInterviews(Array.isArray(interviewData) ? interviewData : []);
          setPanels(Array.isArray(panelData) ? panelData : []);
        }
      } catch {
        if (!cancelled) {
          setInterviews([]);
          setPanels([]);
        }
      } finally {
        if (!cancelled) {
          setInterviewsLoading(false);
        }
      }
    };

    loadInterviews();
    return () => {
      cancelled = true;
    };
  }, [candidate?.id, candidate?.status, steps]);

  const interviewRequests = useMemo(
    () => collectCandidateInterviewRequests(interviews, panels),
    [interviews, panels],
  );

  const visibleTabs = useMemo(
    () => getCandidateDetailTabs(candidate?.status, interviewRequests),
    [candidate?.status, interviewRequests],
  );

  const [activeTab, setActiveTab] = useState('');
  const tabsListRef = useRef(null);

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
      <div className="sticky top-0 z-10 shrink-0 pb-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 rounded-l-xl bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 rounded-r-xl bg-gradient-to-l from-white to-transparent" />
          <TabsList
            ref={tabsListRef}
            className="candidate-tabs-scroll relative flex h-auto w-full min-w-0 items-center justify-start gap-1.5 overflow-x-auto scroll-smooth rounded-xl border border-blue-200 bg-white p-1.5 shadow-sm"
          >
            {visibleTabs.map((tab) => {
              const isInterviewTab = Boolean(tab.interview);
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  title={tab.label}
                  className={cn(
                    'h-9 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm font-medium text-slate-600 transition-all',
                    'hover:bg-slate-50 hover:text-slate-900',
                    'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-blue-200',
                    isInterviewTab && 'data-[state=inactive]:border data-[state=inactive]:border-cyan-100 data-[state=inactive]:bg-cyan-50/40',
                    isInterviewTab && 'data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-800 data-[state=active]:ring-cyan-200',
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
