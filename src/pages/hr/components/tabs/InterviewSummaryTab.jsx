import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NotebookPen } from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { getCandidateStatusLabel } from '@/lib/candidateSteps';

const InterviewSummaryTab = ({ candidate }) => {
  const { formatDateTime } = useFormattedDateTime();
  const closure = candidate?.closure;

  if (!closure) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="text-sm text-slate-500">No interview closure details are available for this candidate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-rose-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application Closure</p>
          </div>
          <div className={`mt-3 grid gap-3 ${closure.closingReasonLabel ? 'sm:grid-cols-2' : ''}`}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Final status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {closure.closedStatusLabel || getCandidateStatusLabel([], closure.closedStatus)}
              </p>
            </div>
            {closure.closingReasonLabel && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Closing reason</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{closure.closingReasonLabel}</p>
              </div>
            )}
          </div>
          {closure.comment && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {closure.closingReasonLabel ? 'Reason / Comment' : 'Comment'}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{closure.comment}</p>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {closure.closedByName ? `Closed by ${closure.closedByName}` : 'Closed'}
            {closure.closedAt ? ` · ${formatDateTime(closure.closedAt)}` : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewSummaryTab;
