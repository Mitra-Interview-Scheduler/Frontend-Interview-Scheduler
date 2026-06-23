import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  Calendar,
  User,
  Briefcase,
  Clock,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Hourglass,
  UserCheck,
} from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import FeedbackResponseDisplay from '@/components/FeedbackResponseDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { feedbackAPI } from '@/services/feedbackAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import { formatInterviewTypeLabel } from '@/lib/candidateSteps';
import { getInterviewStatusMeta, resolveInterviewRequestStatus, getInterviewerDesignationLabel } from '@/lib/candidateInterviews';
import { InterviewScheduleStatus } from '@/lib/statusConstants';
import { cn } from '@/lib/utils';

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

const InterviewDetailTab = ({ interview, candidate, isActive = true, embedded = false }) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [feedbackResponse, setFeedbackResponse] = useState(null);

  const interviewStatus = resolveInterviewRequestStatus(interview);
  const statusMeta = getInterviewStatusMeta(interviewStatus);
  const isCompleted = interviewStatus === InterviewScheduleStatus.COMPLETED;
  const isCancelled = interviewStatus === InterviewScheduleStatus.CANCELLED;
  const isScheduled = interviewStatus === InterviewScheduleStatus.SCHEDULED;
  const scheduleId = interview?.interviewScheduleId;

  const loadFeedback = useCallback(async () => {
    if (!scheduleId || !isCompleted) {
      setFeedbackForm(null);
      setFeedbackResponse(null);
      return;
    }

    setFeedbackLoading(true);
    try {
      const response = await feedbackAPI.getFeedbackForInterview(scheduleId);
      setFeedbackResponse(response);
      if (response?.feedbackFormId) {
        const form = await feedbackQuestionsAPI.getById(response.feedbackFormId);
        setFeedbackForm(form);
      } else {
        setFeedbackForm(null);
      }
    } catch {
      setFeedbackForm(null);
      setFeedbackResponse(null);
    } finally {
      setFeedbackLoading(false);
    }
  }, [scheduleId, isCompleted]);

  useEffect(() => {
    if (!isActive) return undefined;
    loadFeedback();
    return undefined;
  }, [isActive, loadFeedback]);

  const startTime = interview?.scheduledStartDateTime || interview?.preferredStartDateTime;
  const endTime = interview?.scheduledEndDateTime || interview?.preferredEndDateTime;
  const interviewerRole = getInterviewerDesignationLabel(interview);
  const interviewerName = interview?.assignedInterviewerName || '—';
  const coordinatorName = interview?.interviewCoordinatorName?.trim() || 'Not mentioned';

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 pb-6'}>
      {!embedded && isCancelled && (
        <Alert className="border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Interview cancelled</AlertTitle>
          <AlertDescription className="text-red-800">
            This interview was cancelled and will not take place. The interviewer&apos;s time slot has been restored
            to available.
          </AlertDescription>
        </Alert>
      )}

      {!embedded && (
        <Card className={cn('overflow-hidden shadow-sm', isCancelled ? 'border-red-100 opacity-90' : 'border-indigo-100')}>
          <div className={cn('h-1 w-full', isCancelled ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-500 to-sky-500')} />
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl text-gray-900">
                {formatInterviewTypeLabel(interview?.interviewType)}
              </CardTitle>
              <Badge variant="outline" className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField icon={User} label="Interviewer" iconClassName="text-indigo-600">
              {interviewerName}
              {interviewerRole && (
                <span className="text-muted-foreground"> · {interviewerRole}</span>
              )}
            </DetailField>
            <DetailField icon={Calendar} label="Scheduled" iconClassName="text-indigo-600">
              {startTime
                ? (endTime ? formatDateTimeRange(startTime, endTime) : formatDateTime(startTime))
                : '—'}
            </DetailField>
            <DetailField icon={UserCheck} label="Interview Coordinator" iconClassName="text-indigo-600">
              {coordinatorName}
            </DetailField>
            {candidate?.targetDesignationName && (
              <DetailField icon={Briefcase} label="Role" iconClassName="text-indigo-600">
                {candidate.targetDesignationName}
              </DetailField>
            )}
            {isCompleted && interview?.interviewCompletedAt && (
              <DetailField icon={Clock} label="Completed" iconClassName="text-emerald-600">
                {formatDateTime(interview.interviewCompletedAt)}
              </DetailField>
            )}
            {interview?.notes && (
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-800">{interview.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Interview feedback</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isCompleted
                  ? 'Submitted responses from the interviewer after the session.'
                  : isCancelled
                    ? 'No feedback — this interview was cancelled.'
                    : 'Feedback will appear here once the interview is completed.'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {isCancelled && (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p>This round was cancelled, so no feedback was collected.</p>
            </div>
          )}

          {!isCompleted && !isCancelled && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/80 to-white px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                {isScheduled ? <Hourglass className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
              </div>
              <p className="text-sm font-medium text-sky-900">Waiting for interview completion</p>
              <p className="mt-1 max-w-sm text-sm text-sky-700/80">
                The interviewer&apos;s feedback form and ratings will show up here after the session ends.
              </p>
            </div>
          )}

          {isCompleted && (
            <>
              {feedbackLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
                  <p className="text-sm">Loading feedback…</p>
                </div>
              ) : !feedbackResponse ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
                  <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">No feedback on record</p>
                    <p className="mt-1 text-amber-800/90">
                      The interview was marked complete but no feedback form was submitted.
                    </p>
                  </div>
                </div>
              ) : (
                <FeedbackResponseDisplay
                  form={feedbackForm}
                  responses={feedbackResponse?.responses || {}}
                  submittedAt={feedbackResponse?.submittedAt}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewDetailTab;
