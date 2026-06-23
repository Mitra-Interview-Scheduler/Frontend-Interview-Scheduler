import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  MessageSquare,
  Calendar,
  Briefcase,
  Users,
  Loader2,
  ClipboardList,
  Hourglass,
  UserCheck,
} from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';
import {
  getInterviewStatusMeta,
  resolveInterviewRequestStatus,
  getInterviewerDesignationLabel,
} from '@/lib/candidateInterviews';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import FeedbackResponseDisplay from '@/components/FeedbackResponseDisplay';
import { feedbackAPI } from '@/services/feedbackAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';

const DetailField = ({ icon: Icon, label, children, iconClassName }) => (
  <div className="flex items-start gap-3">
    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100', iconClassName)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  </div>
);

const derivePanelStatus = (requests) => {
  if (requests.every((request) => resolveInterviewRequestStatus(request) === InterviewScheduleStatus.CANCELLED)) {
    return InterviewScheduleStatus.CANCELLED;
  }
  if (requests.some((request) => resolveInterviewRequestStatus(request) === InterviewScheduleStatus.COMPLETED)) {
    return InterviewScheduleStatus.COMPLETED;
  }
  return InterviewScheduleStatus.SCHEDULED;
};

const PanelInterviewDetailTab = ({
  panel,
  panelRequests = [],
  candidate,
  isActive = true,
}) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [feedbackResponse, setFeedbackResponse] = useState(null);
  const [feedbackSubmitterName, setFeedbackSubmitterName] = useState(null);

  const requests = useMemo(
    () => (Array.isArray(panelRequests) ? panelRequests : []).filter(Boolean),
    [panelRequests],
  );

  const panelStatus = derivePanelStatus(requests);
  const statusMeta = getInterviewStatusMeta(panelStatus);
  const allCancelled = panelStatus === InterviewScheduleStatus.CANCELLED;
  const hasFeedback = Boolean(feedbackResponse);
  const isScheduled = panelStatus === InterviewScheduleStatus.SCHEDULED && !hasFeedback;

  const interviewType = requests[0]?.interviewType;
  const coordinatorName = requests[0]?.interviewCoordinatorName?.trim() || 'Not mentioned';
  const startTime = panel?.startDateTime || requests[0]?.scheduledStartDateTime || requests[0]?.preferredStartDateTime;
  const endTime = panel?.endDateTime || requests[0]?.scheduledEndDateTime || requests[0]?.preferredEndDateTime;

  const loadPanelFeedback = useCallback(async () => {
    if (!isActive || requests.length === 0) {
      setFeedbackForm(null);
      setFeedbackResponse(null);
      setFeedbackSubmitterName(null);
      return;
    }

    setFeedbackLoading(true);
    try {
      for (const request of requests) {
        const scheduleId = request?.interviewScheduleId;
        if (!scheduleId) continue;

        const response = await feedbackAPI.getFeedbackForInterview(scheduleId);
        if (response) {
          setFeedbackResponse(response);
          setFeedbackSubmitterName(request.assignedInterviewerName || null);
          if (response.feedbackFormId) {
            const form = await feedbackQuestionsAPI.getById(response.feedbackFormId);
            setFeedbackForm(form);
          } else {
            setFeedbackForm(null);
          }
          return;
        }
      }

      setFeedbackForm(null);
      setFeedbackResponse(null);
      setFeedbackSubmitterName(null);
    } finally {
      setFeedbackLoading(false);
    }
  }, [isActive, requests]);

  useEffect(() => {
    loadPanelFeedback();
  }, [loadPanelFeedback]);

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        No panel interview details are available.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {allCancelled && (
        <Alert className="border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Panel interview cancelled</AlertTitle>
          <AlertDescription className="text-red-800">
            This panel interview was cancelled. All interviewer slots have been restored.
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Panel interview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatInterviewTypeLabel(interviewType)} · {requests.length} interviewer{requests.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={statusMeta.className}>
              {statusMeta.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField icon={Calendar} label="Scheduled" iconClassName="text-sky-600">
              {startTime
                ? (endTime ? formatDateTimeRange(startTime, endTime) : formatDateTime(startTime))
                : '—'}
            </DetailField>
            <DetailField icon={UserCheck} label="Interview Coordinator" iconClassName="text-sky-600">
              {coordinatorName}
            </DetailField>
            {candidate?.targetDesignationName && (
              <DetailField icon={Briefcase} label="Candidate role" iconClassName="text-sky-600">
                {candidate.targetDesignationName}
              </DetailField>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Panel interviewers
            </p>
            <ul className="space-y-3">
              {requests.map((request) => {
                const name = request.assignedInterviewerName || 'Interviewer';
                const role = getInterviewerDesignationLabel(request);
                return (
                  <li key={request.interviewScheduleId ?? request.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-sm text-slate-900">
                      <span className="font-medium">{name}</span>
                      {role && (
                        <span className="text-muted-foreground"> · {role}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
           
          </div>

          {panel?.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-800">{panel.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Interview feedback</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFeedback
                  ? `Submitted by ${feedbackSubmitterName || 'a panel interviewer'}.`
                  : allCancelled
                    ? 'No feedback — this panel interview was cancelled.'
                    : 'Feedback from any panel interviewer will appear here once submitted.'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {allCancelled && (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p>This panel interview was cancelled, so no feedback was collected.</p>
            </div>
          )}

          {!allCancelled && feedbackLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading feedback…</p>
            </div>
          )}

          {!allCancelled && !feedbackLoading && isScheduled && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/80 to-white px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Hourglass className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-sky-900">Waiting for feedback</p>
              <p className="mt-1 max-w-sm text-sm text-sky-700/80">
                Once any panel interviewer completes the session and submits the form, it will show here.
              </p>
            </div>
          )}

          {!allCancelled && !feedbackLoading && !hasFeedback && panelStatus === InterviewScheduleStatus.COMPLETED && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">No feedback on record</p>
                <p className="mt-1 text-amber-800/90">
                  The panel interview was marked complete but no feedback form was submitted yet.
                </p>
              </div>
            </div>
          )}

          {!allCancelled && !feedbackLoading && hasFeedback && (
            <FeedbackResponseDisplay
              form={feedbackForm}
              responses={feedbackResponse?.responses || {}}
              submittedAt={feedbackResponse?.submittedAt}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelInterviewDetailTab;
