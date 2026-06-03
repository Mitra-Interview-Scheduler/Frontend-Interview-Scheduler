import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getVisibleTabs } from './candidateDetailsTabsConfig';

const CandidateDetailsTabs = ({
  candidate,
  documents = [],
  documentsLoading = false,
  onPreviewDocument = () => {},
  onDownloadDocument = () => {},
}) => {
  const visibleTabs = getVisibleTabs(candidate?.status);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value || '');

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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col overflow-hidden ">
      <TabsList className={`grid w-full grid-cols-${visibleTabs.length} bg-gradient-to-r from-blue-50 to-indigo-50 p-1 rounded-lg border border-blue-200 flex-shrink-0`}>
        {visibleTabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {visibleTabs.map(tab => {
        const TabComponent = tab.component;
        const isReadOnly = !tab.editableStages.includes(candidate.status);
        return (
          <TabsContent key={tab.value} value={tab.value} className="mt-6 flex-1 overflow-y-auto pr-4">
            <TabComponent
              candidate={candidate}
              readOnly={isReadOnly}
              documents={documents}
              documentsLoading={documentsLoading}
              onPreviewDocument={onPreviewDocument}
              onDownloadDocument={onDownloadDocument}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default CandidateDetailsTabs;
