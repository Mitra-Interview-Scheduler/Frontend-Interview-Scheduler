import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, User, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';
import FeedbackResponseDisplay from '@/components/FeedbackResponseDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { feedbackAPI } from '@/services/feedbackAPI';
import { feedbackQuestionsAPI } from '@/services/feedbackQuestionsAPI';
import {
  formatInterviewTypeLabel,
} from '@/lib/candidateSteps';
import { getInterviewStatusMeta, resolveInterviewRequestStatus } from '@/lib/candidateInterviews';

const InterviewDetailTab = ({ interview, candidate, isActive = true }) => {
  const { formatDateTime, formatDateTimeRange } = useFormattedDateTime();
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [feedbackResponse, setFeedbackResponse] = useState(null);

  const interviewStatus = resolveInterviewRequestStatus(interview);
  const statusMeta = getInterviewStatusMeta(interviewStatus);
  const isCompleted = interviewStatus === 'COMPLETED';
  const isCancelled = interviewStatus === 'CANCELLED';
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

  return (
    <div className="space-y-6 pb-6">
      {isCancelled && (
        <Alert className="border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Interview cancelled</AlertTitle>
          <AlertDescription className="text-red-800">
            This interview was cancelled and will not take place. The interviewer&apos;s time slot has been restored
            to available.
          </AlertDescription>
        </Alert>
      )}

      <Card className={`shadow-sm ${isCancelled ? 'border-red-100 opacity-90' : 'border-blue-100'}`}>
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
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Interviewer</p>
              <p className="text-sm text-gray-900">{interview?.assignedInterviewerName || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled</p>
              <p className="text-sm text-gray-900">
                {startTime
                  ? (endTime ? formatDateTimeRange(startTime, endTime) : formatDateTime(startTime))
                  : '—'}
              </p>
            </div>
          </div>
          {candidate?.targetDesignationName && (
            <div className="flex items-start gap-3">
              <Briefcase className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</p>
                <p className="text-sm text-gray-900">{candidate.targetDesignationName}</p>
              </div>
            </div>
          )}
          {isCompleted && interview?.interviewCompletedAt && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Completed</p>
                <p className="text-sm text-gray-900">{formatDateTime(interview.interviewCompletedAt)}</p>
              </div>
            </div>
          )}
          {interview?.notes && (
            <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-800">{interview.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isCompleted && !isCancelled && (
        <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50 px-4 py-5 text-sm text-sky-800">
          Interview feedback will appear here once the interviewer completes the interview.
        </div>
      )}

      {isCompleted && (
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Interview Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading feedback…
              </div>
            ) : !feedbackResponse ? (
              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
                No feedback record was found for this interview. Feedback may not have been submitted before completion.
              </div>
            ) : (
              <FeedbackResponseDisplay
                form={feedbackForm}
                responses={feedbackResponse?.responses || {}}
                submittedAt={feedbackResponse?.submittedAt}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterviewDetailTab;
